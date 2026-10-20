import { describe, expect, it } from "vitest";
import { aiClubs, aiMarketRound } from "../../../src/market/ai/round";
import { DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import type { MarketContext } from "../../../src/market/types";
import { POSITIONS } from "../../../src/model/catalogs";
import { SQUAD_RULES } from "../../../src/renewal/rules";
import { applied, contextAfter, MANAGER, marketContext, totalCash } from "../helpers";

const open = marketContext();
const started = performance.now();
const first = aiMarketRound(open);
const elapsed = performance.now() - started;

function aiDeals(update: { market: MarketContext["market"] }) {
  return update.market.log.filter(
    (entry) =>
      entry.outcome === undefined &&
      entry.kind === "sale" &&
      entry.toClubId !== MANAGER &&
      entry.fromClubId !== MANAGER,
  );
}

function squadsValid(context: Pick<MarketContext, "world" | "league">) {
  for (const clubId of context.league.divisions.flatMap((season) => season.clubIds)) {
    const squad = context.world.players.filter((player) => player.clubId === clubId);
    expect(squad.length, clubId).toBeGreaterThanOrEqual(SQUAD_RULES.min);
    expect(squad.length, clubId).toBeLessThanOrEqual(SQUAD_RULES.max);
    for (const position of POSITIONS) {
      const count = squad.filter((player) => player.position === position).length;
      expect(count, `${clubId} ${position}`).toBeGreaterThanOrEqual(
        SQUAD_RULES.positionMin[position],
      );
      expect(count, `${clubId} ${position}`).toBeLessThanOrEqual(
        DEFAULT_AI_MARKET.positionMax[position],
      );
    }
  }
}

describe("rodada da IA de mercado (US1, US2)", () => {
  it("com a janela aberta há transferências entre clubes da IA", () => {
    expect(aiDeals(first).length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  });

  it("respeita os limites por rodada e por clube na janela", () => {
    expect(aiDeals(first).length).toBeLessThanOrEqual(DEFAULT_AI_MARKET.maxDealsPerRound);
    let ctx = applied(open, first);
    for (let index = 0; index < 4; index++) ctx = applied(ctx, aiMarketRound(ctx));
    for (const clubId of aiClubs(ctx)) {
      const buys = aiDeals(ctx).filter((entry) => entry.toClubId === clubId).length;
      expect(buys, clubId).toBeLessThanOrEqual(DEFAULT_AI_MARKET.maxBuysPerWindow);
    }
  });

  it("elencos seguem válidos e dentro do teto; o clube do humano fica intocado", () => {
    squadsValid(applied(open, first));
    const own = (ctx: Pick<MarketContext, "world">) =>
      ctx.world.players.filter((player) => player.clubId === MANAGER).map((player) => player.id);
    expect(own(first)).toEqual(own(open));
    expect(first.departed).toEqual([]);
  });

  it("cada negócio lança a taxa nos dois caixas e a soma não muda (SC-006)", () => {
    expect(totalCash(first)).toBe(totalCash(open));
    const purchases = first.finances.ledger.filter(
      (entry) => entry.category === "transfer_purchase",
    );
    const paid = first.market.log.filter((entry) => entry.outcome === undefined && entry.fee > 0);
    expect(purchases.length).toBe(paid.length);
  });

  it("um jogador muda no máximo uma vez por rodada", () => {
    const ids = aiDeals(first).map((entry) => entry.playerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fora da janela não há compras entre clubes", () => {
    const closed = contextAfter(5);
    expect(aiDeals(aiMarketRound(closed))).toEqual([]);
  });

  it("é determinística (SC-007)", () => {
    expect(aiMarketRound(open)).toEqual(first);
  });

  it("clube em crise não compra", () => {
    const crisis: MarketContext = {
      ...open,
      finances: {
        ...open.finances,
        clubs: Object.fromEntries(
          Object.entries(open.finances.clubs).map(([id, club]) => [
            id,
            { ...club, inCrisis: true },
          ]),
        ),
      },
    };
    expect(aiDeals(aiMarketRound(crisis))).toEqual([]);
  });
});
