import { askingPrice, wageDemand } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  answerManagerClubCounter,
  answerManagerIncomingOffer,
  cancelManagerNegotiation,
  marketAfterRoundOf,
  marketContextOf,
  proposeManagerContract,
  startManagerNegotiation,
} from "../src";
import { validSave } from "./fixtures";

const save = validSave();
const context = marketContextOf(save);
const target = save.bank.players
  .filter((player) => player.clubId !== save.clubId && player.position === "MF")
  .sort((a, b) => a.strength - b.strength)[0];
if (!target) throw new Error("sem jogador");
const ask = askingPrice(context, target);

describe("mercado no save (contracts/save-and-ui.md)", () => {
  it("compra completa grava mundo, finanças e mercado", () => {
    const started = startManagerNegotiation(save, { kind: "buy", playerId: target.id, fee: ask });
    if (!started.ok) throw new Error(JSON.stringify(started.error));
    expect(started.save.market.negotiations).toHaveLength(1);
    const id = started.step.negotiation?.id ?? "";
    const demand = wageDemand(context, target, save.clubId);
    const done = proposeManagerContract(started.save, id, { wage: demand, years: 3 });
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    const bought = done.save.bank.players.find((player) => player.id === target.id);
    expect(bought?.clubId).toBe(save.clubId);
    expect(done.save.market.negotiations).toEqual([]);
    expect(done.save.market.log.at(-1)?.kind).toBe("buy");
    expect(done.save.finances.clubs[save.clubId]?.cash).toBe(
      (save.finances.clubs[save.clubId]?.cash ?? 0) - ask,
    );
    expect(save.bank.players.find((player) => player.id === target.id)?.clubId).toBe(target.clubId);
  });

  it("erros do motor voltam sem alterar o save", () => {
    const result = startManagerNegotiation(save, { kind: "buy", playerId: "x", fee: 10 });
    expect(result).toMatchObject({ ok: false, error: { code: "market.not_found" } });
  });

  it("contraproposta recusada e cancelamento fecham a negociação", () => {
    const started = startManagerNegotiation(save, {
      kind: "buy",
      playerId: target.id,
      fee: Math.ceil(ask * 0.75),
    });
    if (!started.ok) throw new Error("falhou");
    const id = started.step.negotiation?.id ?? "";
    const refused = answerManagerClubCounter(started.save, id, false);
    if (!refused.ok) throw new Error("falhou");
    expect(refused.save.market.negotiations).toEqual([]);
    const cancelled = cancelManagerNegotiation(started.save, id);
    expect(cancelled.market.negotiations).toEqual([]);
  });
});

describe("depois da rodada (R10)", () => {
  it("com a janela aberta e chance total, a IA faz uma proposta que fica no save", () => {
    const eager = JSON.parse(JSON.stringify(save)) as typeof save;
    const competition = eager.bank.competitions[0];
    if (competition) {
      competition.market = {
        incoming: {
          chancePct: 100,
          maxOpen: 3,
          expireRounds: 3,
          minPct: 85,
          maxPct: 110,
          cashBufferMonths: 0,
        },
      };
    }
    const next = marketAfterRoundOf(eager);
    expect(next.market.incoming.length).toBe(1);
    const offer = next.market.incoming[0];
    const answered = answerManagerIncomingOffer(next, offer?.id ?? "", { kind: "refuse" });
    if (!answered.ok) throw new Error(JSON.stringify(answered.error));
    expect(answered.save.market.incoming).toEqual([]);
  });

  it("aceitar uma venda tira o jogador da escalação com aviso", () => {
    const eager = JSON.parse(JSON.stringify(save)) as typeof save;
    const competition = eager.bank.competitions[0];
    if (competition) {
      competition.market = {
        incoming: {
          chancePct: 100,
          maxOpen: 3,
          expireRounds: 3,
          minPct: 85,
          maxPct: 110,
          cashBufferMonths: 0,
        },
      };
    }
    let current = eager;
    let offer = current.market.incoming.find((entry) => entry.kind === "buy");
    for (let attempt = 0; attempt < 8 && !offer; attempt++) {
      current = marketAfterRoundOf({
        ...current,
        market: { ...current.market, incoming: [] },
        league: current.league,
      });
      offer = current.market.incoming.find((entry) => entry.kind === "buy");
      if (!offer) current = { ...current, seed: `${current.seed}x` };
    }
    if (!offer) throw new Error("sem proposta de compra");
    const starterIds = new Set(Object.values(current.lineup.starters));
    const answered = answerManagerIncomingOffer(current, offer.id, { kind: "accept" });
    if (!answered.ok) throw new Error(JSON.stringify(answered.error));
    const sold = answered.save.bank.players.find((player) => player.id === offer?.playerId);
    expect(sold?.clubId).not.toBe(current.clubId);
    const lineupIds = [
      ...Object.values(answered.save.lineup.starters),
      ...answered.save.lineup.bench,
    ];
    expect(lineupIds).not.toContain(offer.playerId);
    if (starterIds.has(offer.playerId)) {
      expect(
        answered.save.lineupNotice?.some(
          (change) => "outId" in change && change.outId === offer?.playerId,
        ),
      ).toBe(true);
    }
  });
});
