import { describe, expect, it } from "vitest";
import { maxBidFor } from "../../src/market/club-response";
import { answerIncomingOffer, marketAfterRound } from "../../src/market/incoming";
import { startNegotiation } from "../../src/market/negotiation";
import { marketValue } from "../../src/market/value";
import {
  applied,
  contextAfter,
  contractWorld,
  MANAGER,
  marketContext,
  playerOf,
  totalCash,
} from "./helpers";

const ALWAYS = {
  chancePct: 100,
  maxOpen: 3,
  expireRounds: 3,
  minPct: 85,
  maxPct: 110,
  cashBufferMonths: 0,
};

function worldWith(incoming = ALWAYS) {
  return contractWorld((world) => {
    const competition = world.competitions[0];
    if (competition) competition.market = { incoming };
  });
}

function withOffers(count = 1) {
  let ctx = marketContext({ world: worldWith() });
  for (let index = 0; index < count; index++) {
    const update = marketAfterRound(ctx);
    ctx = applied(ctx, update);
  }
  return ctx;
}

describe("propostas pelos meus jogadores (US4, R10)", () => {
  it("com a janela aberta a IA propõe por jogador do usuário, só quem teria vaga de titular", () => {
    const ctx = withOffers(1);
    expect(ctx.market.incoming).toHaveLength(1);
    const offer = ctx.market.incoming[0];
    if (!offer) throw new Error("sem proposta");
    const player = ctx.world.players.find((entry) => entry.id === offer.playerId);
    expect(player?.clubId).toBe(MANAGER);
    expect(offer.fromClubId).not.toBe(MANAGER);
    if (!player) throw new Error("sem jogador");
    const value = marketValue(player, ctx.world, ctx.league.year);
    if (offer.kind === "buy") {
      expect(offer.fee).toBeGreaterThanOrEqual(Math.round(value * 0.85) - 1000);
      expect(offer.fee).toBeLessThanOrEqual(Math.round(value * 1.1) + 1000);
    }
    expect(offer.expiresRound).toBe(3);
  });

  it("no máximo três abertas, sem repetir jogador", () => {
    const ctx = withOffers(6);
    expect(ctx.market.incoming.length).toBeLessThanOrEqual(3);
    const ids = ctx.market.incoming.map((offer) => offer.playerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sem janela aberta não há propostas e as abertas expiram", () => {
    const open = withOffers(1);
    const closed = { ...contextAfter(5, { world: worldWith() }), market: open.market };
    const update = marketAfterRound(closed);
    expect(update.market.incoming).toEqual([]);
    expect(update.market.log.at(-1)).toMatchObject({ outcome: "expired" });
    const none = marketAfterRound(contextAfter(5, { world: worldWith() }));
    expect(none.market.incoming).toEqual([]);
  });

  it("negociações de clube expiram quando a janela fecha; livres e renovações não", () => {
    const ctx = marketContext();
    const target = playerOf(ctx, (player) => player.position === "MF");
    const started = startNegotiation(ctx, {
      kind: "buy",
      playerId: target.id,
      fee: 999_999_000 > (ctx.finances.clubs[MANAGER]?.cash ?? 0) ? 1_000_000 : 999_999_000,
    });
    if (!started.ok) throw new Error(JSON.stringify(started.error));
    const open = applied(ctx, started.value.update);
    const stale = { ...contextAfter(5), market: open.market };
    const update = marketAfterRound(stale);
    expect(update.market.negotiations.filter((entry) => entry.kind === "buy")).toEqual([]);
  });

  it("proposta vence depois do prazo", () => {
    const ctx = withOffers(1);
    const later = { ...ctx, league: contextAfter(2, { world: worldWith() }).league };
    const update = marketAfterRound({ ...later, market: { ...ctx.market } });
    // ainda na janela, mas o prazo (rodada 3) não passou: continua
    expect(update.market.incoming.some((offer) => offer.id === ctx.market.incoming[0]?.id)).toBe(
      true,
    );
    const expired = marketAfterRound({
      ...contextAfter(3, { world: worldWith() }),
      market: {
        ...ctx.market,
        incoming: ctx.market.incoming.map((offer) => ({ ...offer, expiresRound: 2 })),
      },
    });
    expect(expired.market.incoming.some((offer) => offer.id === ctx.market.incoming[0]?.id)).toBe(
      false,
    );
  });

  it("aceitar vende: caixa, elenco, escalação (departed) e registro", () => {
    const ctx = withOffers(1);
    const offer = ctx.market.incoming[0];
    if (!offer) throw new Error("sem proposta");
    const result = answerIncomingOffer(ctx, offer.id, { kind: "accept" });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const { update } = result.value;
    const sold = update.world.players.find((player) => player.id === offer.playerId);
    if (offer.kind === "buy") {
      expect(sold?.clubId).toBe(offer.fromClubId);
      expect(update.finances.clubs[MANAGER]?.cash).toBe(
        (ctx.finances.clubs[MANAGER]?.cash ?? 0) + offer.fee,
      );
    } else {
      expect(sold?.contract?.loan?.fromClubId).toBe(MANAGER);
    }
    expect(update.departed).toEqual([offer.playerId]);
    expect(totalCash(update)).toBe(totalCash(ctx));
    expect(update.market.incoming).toEqual([]);
  });

  it("recusar remove a proposta", () => {
    const ctx = withOffers(1);
    const offer = ctx.market.incoming[0];
    const result = answerIncomingOffer(ctx, offer?.id ?? "", { kind: "refuse" });
    if (!result.ok) throw new Error("falhou");
    expect(result.value.update.market.incoming).toEqual([]);
    expect(result.value.update.world).toBe(ctx.world);
    expect(result.value.update.market.log.at(-1)).toMatchObject({ outcome: "rejected_by_user" });
  });

  it("contraproposta é respondida na hora, uma única vez: aceita até o limite, senão recusa", () => {
    const buy = (() => {
      for (let round = 1; round <= 12; round++) {
        const ctx = withOffers(round);
        if (ctx.market.incoming.some((offer) => offer.kind === "buy")) return ctx;
      }
      throw new Error("sem proposta de compra");
    })();
    const offer = buy.market.incoming.find((entry) => entry.kind === "buy");
    const player = buy.world.players.find((entry) => entry.id === offer?.playerId);
    if (!offer || !player) throw new Error("sem proposta");
    const buyerCash = buy.finances.clubs[offer.fromClubId]?.cash ?? 0;
    const limit = Math.min(maxBidFor(buy, player, offer.id), buyerCash);
    const accepted = answerIncomingOffer(buy, offer.id, { kind: "counter", fee: limit });
    if (!accepted.ok) throw new Error(JSON.stringify(accepted.error));
    expect(accepted.value.response).toBe("accepted");
    expect(accepted.value.update.finances.clubs[MANAGER]?.cash).toBe(
      (buy.finances.clubs[MANAGER]?.cash ?? 0) + limit,
    );
    const refused = answerIncomingOffer(buy, offer.id, {
      kind: "counter",
      fee: maxBidFor(buy, player, offer.id) + 1_000_000,
    });
    if (!refused.ok) throw new Error("falhou");
    expect(refused.value.response).toBe("refused");
    expect(refused.value.update.market.incoming.some((entry) => entry.id === offer.id)).toBe(false);
    const again = answerIncomingOffer(
      refused.value.update.market.incoming.length
        ? applied(buy, refused.value.update)
        : applied(buy, refused.value.update),
      offer.id,
      { kind: "counter", fee: limit },
    );
    expect(again).toMatchObject({ ok: false, error: { code: "market.not_found" } });
  });

  it("proposta inexistente e valor inválido", () => {
    const ctx = withOffers(1);
    expect(answerIncomingOffer(ctx, "off-x", { kind: "accept" })).toMatchObject({
      ok: false,
      error: { code: "market.not_found" },
    });
    const buy = ctx.market.incoming.find((offer) => offer.kind === "buy");
    if (buy) {
      expect(answerIncomingOffer(ctx, buy.id, { kind: "counter", fee: 0 })).toMatchObject({
        ok: false,
        error: { code: "market.invalid_amount" },
      });
    }
  });
});
