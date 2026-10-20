import { describe, expect, it } from "vitest";
import { clubNeeds } from "../../../src/market/ai/needs";
import { DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import type { MarketContext } from "../../../src/market/types";
import { MANAGER, marketContext } from "../helpers";

const base = marketContext();
const CLUB = base.world.clubs.find((club) => club.id !== MANAGER)?.id ?? "";

function without(context: MarketContext, ids: Set<string>): MarketContext {
  return {
    ...context,
    world: { ...context.world, players: context.world.players.filter((p) => !ids.has(p.id)) },
  };
}

describe("necessidades do clube (R2, FR-001, FR-002)", () => {
  it("posição abaixo do mínimo fica descoberta e vem primeiro", () => {
    const keepers = base.world.players.filter((p) => p.clubId === CLUB && p.position === "GK");
    const ctx = without(base, new Set(keepers.slice(0, keepers.length - 1).map((p) => p.id)));
    const needs = clubNeeds(ctx, CLUB);
    expect(needs.positions.GK.uncovered).toBe(true);
    expect(needs.priorities[0]).toBe("GK");
  });

  it("titular abaixo do alvo menos a folga é posição fraca", () => {
    const ctx: MarketContext = {
      ...base,
      world: {
        ...base.world,
        players: base.world.players.map((p) =>
          p.clubId === CLUB && p.position === "FW" ? { ...p, strength: 20 } : p,
        ),
      },
    };
    const needs = clubNeeds(ctx, CLUB);
    expect(needs.positions.FW.weak).toBe(true);
    expect(needs.priorities).toContain("FW");
    expect(needs.positions.FW.starter).toBe(20);
  });

  it("excesso lista os menos úteis como excedentes", () => {
    const sample = base.world.players.find((p) => p.clubId === CLUB && p.position === "GK");
    if (!sample) throw new Error("sem goleiro");
    const extras = Array.from({ length: 4 }, (_, index) => ({
      ...sample,
      id: `gk-extra-${index}`,
      strength: 10 + index,
    }));
    const ctx: MarketContext = {
      ...base,
      world: { ...base.world, players: [...base.world.players, ...extras] },
    };
    const needs = clubNeeds(ctx, CLUB);
    expect(needs.positions.GK.excess).toBe(true);
    expect(needs.surplus[0]).toBe("gk-extra-0");
    expect(needs.positions.GK.max).toBe(DEFAULT_AI_MARKET.positionMax.GK);
  });

  it("orçamento é caixa menos reserva e zera em crise", () => {
    const needs = clubNeeds(base, CLUB);
    expect(needs.budget).toBeLessThan(base.finances.clubs[CLUB]?.cash ?? 0);
    const crisis: MarketContext = {
      ...base,
      finances: {
        ...base.finances,
        clubs: {
          ...base.finances.clubs,
          [CLUB]: { ...(base.finances.clubs[CLUB] ?? ({} as never)), inCrisis: true },
        },
      },
    };
    expect(clubNeeds(crisis, CLUB).budget).toBe(0);
  });

  it("alvo cresce com a ambição e elenco envelhecido é marcado", () => {
    const sorted = [...base.world.clubs].sort((a, b) => a.reputation - b.reputation);
    const low = sorted[0]?.id ?? "";
    const high = sorted[sorted.length - 1]?.id ?? "";
    expect(clubNeeds(base, high).target).toBeGreaterThan(clubNeeds(base, low).target);
    const aged: MarketContext = {
      ...base,
      world: {
        ...base.world,
        players: base.world.players.map((p) =>
          p.clubId === CLUB ? { ...p, birthDate: "1980-01-01" } : p,
        ),
      },
    };
    expect(clubNeeds(aged, CLUB).old).toBe(true);
    expect(clubNeeds(base, CLUB).meanAge).toBeGreaterThan(18);
  });
});
