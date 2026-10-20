import { describe, expect, it } from "vitest";
import { ageOn } from "../../../src/calendar/date";
import { youthLoan } from "../../../src/market/ai/loans";
import { clubNeeds } from "../../../src/market/ai/needs";
import { DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import { strengthRank } from "../../../src/market/squad";
import type { MarketContext } from "../../../src/market/types";
import { contextAfter, MANAGER, marketContext } from "../helpers";

const base = marketContext();
const clubs = [...base.world.clubs]
  .filter((club) => club.id !== MANAGER)
  .sort((a, b) => b.reputation - a.reputation);
const ORIGIN = clubs[0]?.id ?? "";

/** Contexto com um jovem promissor no banco do clube de origem. */
function withProspect(context: MarketContext): { context: MarketContext; id: string } {
  const squad = context.world.players
    .filter((player) => player.clubId === ORIGIN && player.position === "MF")
    .sort((a, b) => a.strength - b.strength);
  const bench = squad[0];
  if (!bench) throw new Error("sem jogador");
  const prospect = {
    ...bench,
    birthDate: `${context.league.year - 19}-01-01`,
    strength: 60,
    hidden: { ...bench.hidden, potential: 85 },
  };
  return {
    context: {
      ...context,
      world: {
        ...context.world,
        players: context.world.players.map((p) => (p.id === bench.id ? prospect : p)),
      },
    },
    id: bench.id,
  };
}

describe("empréstimo de jovens (011 R6, FR-005)", () => {
  const { context, id } = withProspect(base);
  const plan = youthLoan(context, ORIGIN);

  it("jovem promissor no banco vai para clube menor onde seria titular", () => {
    if (!plan) throw new Error("sem empréstimo");
    expect(plan.playerId).toBe(id);
    const prospect = context.world.players.find((player) => player.id === id);
    if (!prospect) throw new Error("sem jogador");
    expect(ageOn(prospect.birthDate, `${context.league.year}-06-01`)).toBeLessThanOrEqual(
      DEFAULT_AI_MARKET.loanMaxAge,
    );
    expect(strengthRank(context.world, ORIGIN, id)).toBeGreaterThan(
      DEFAULT_AI_MARKET.loanBenchRank,
    );
    const borrower = context.world.clubs.find((club) => club.id === plan.toClubId);
    const origin = context.world.clubs.find((club) => club.id === ORIGIN);
    expect(borrower?.reputation ?? 0).toBeLessThan(origin?.reputation ?? 0);
    expect(prospect.strength).toBeGreaterThanOrEqual(
      clubNeeds(context, plan.toClubId).positions[prospect.position].starter,
    );
    expect(plan.toClubId).not.toBe(MANAGER);
  });

  it("um empréstimo cedido por clube por janela", () => {
    const logged: MarketContext = {
      ...context,
      market: {
        ...context.market,
        log: [
          {
            season: context.league.number,
            round: 0,
            playerId: "x",
            displayName: "x",
            kind: "loan_out",
            fromClubId: ORIGIN,
            toClubId: "clube-040",
            fee: 0,
          },
        ],
      },
    };
    expect(youthLoan(logged, ORIGIN)).toBeUndefined();
  });

  it("o clube do humano nunca empresta pela IA", () => {
    expect(youthLoan(context, MANAGER)).toBeUndefined();
  });

  it("é determinístico", () => {
    expect(youthLoan(context, ORIGIN)).toEqual(plan);
  });

  it("sem jovens promissores não há empréstimo", () => {
    const flat: MarketContext = {
      ...contextAfter(1),
      world: {
        ...base.world,
        players: base.world.players.map((p) => ({ ...p, hidden: { ...p.hidden, potential: 40 } })),
      },
    };
    expect(youthLoan(flat, ORIGIN)).toBeUndefined();
  });
});
