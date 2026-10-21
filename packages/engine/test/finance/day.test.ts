import { describe, expect, it } from "vitest";
import { seasonDate } from "../../src/calendar/date";
import { advanceCareerDays, completeCareerDay } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { annualWageBill } from "../../src/finance/create";
import { MANAGER, newState } from "../career/day-helpers";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { testWorld } from "../season/helpers/world";

const SEED = "financas-dia";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

describe("finanças por dia (017 R7, FR-027, FR-028)", () => {
  const world = twoCompetitionsBank();

  it("um dia só do torneio lança a bilheteria de cada jogo em casa, com data e competição", () => {
    const state = newState(world, SEED);
    const wednesday = ok(advanceCareerDays(state, { days: 2 }, SEED, MANAGER));
    const before = wednesday.finances.ledger.length;
    const after = ok(completeCareerDay(wednesday, SEED, MANAGER));
    const entries = after.finances.ledger.slice(before);
    // 5 jogos do torneio: só os 5 mandantes recebem bilheteria; nada de folha ou juros.
    expect(entries).toHaveLength(5);
    expect(new Set(entries.map((entry) => entry.category))).toEqual(new Set(["gate"]));
    expect(entries.every((entry) => entry.competitionId === TOURNAMENT_ID)).toBe(true);
    expect(entries.every((entry) => entry.date === "2027-01-13")).toBe(true);
    expect(entries.every((entry) => entry.amount > 0)).toBe(true);
    const gates = after.finances.gates.slice(wednesday.finances.gates.length);
    expect(gates).toHaveLength(5);
    expect(gates.every((gate) => gate.competitionId === TOURNAMENT_ID && gate.attendance > 0)).toBe(
      true,
    );
    const homes = after.competitions[0]?.divisions[0]?.records.map((record) => record.home);
    expect(new Set(entries.map((entry) => entry.clubId))).toEqual(new Set(homes));
  });

  it("o dia da liga continua com bilheteria, folha e o resto, como antes", () => {
    const state = newState(world, SEED);
    const after = ok(completeCareerDay(state, SEED, MANAGER));
    const categories = new Set(after.finances.ledger.map((entry) => entry.category));
    expect(categories.has("gate")).toBe(true);
    expect(categories.has("wages")).toBe(true);
  });

  it("a folha anual de cada clube é a mesma com ou sem outras competições", () => {
    const date = seasonDate(world.manifest.referenceDate, 2027);
    const withTournament = ok(
      advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER),
    );
    const alone = ok(
      advanceCareerDays(newState(testWorld(), SEED), { toEnd: true }, SEED, MANAGER),
    );
    for (const clubId of ["clube-001", "clube-010", "clube-040"]) {
      const wages = (state: CareerSeasonState) =>
        state.finances.ledger
          .filter((entry) => entry.clubId === clubId && entry.category === "wages")
          .reduce((sum, entry) => sum + entry.amount, 0);
      expect(wages(withTournament)).toBe(-annualWageBill(world, clubId, date));
      expect(wages(withTournament)).toBe(wages(alone));
    }
  }, 120_000);

  it("os clubes do torneio ganham renda extra dos jogos em casa", () => {
    const withTournament = ok(
      advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER),
    );
    const homeGates = (clubId: string) =>
      withTournament.finances.gates.filter(
        (gate) => gate.clubId === clubId && gate.competitionId === TOURNAMENT_ID,
      );
    expect(homeGates("clube-001")).toHaveLength(9);
    expect(homeGates("clube-040")).toHaveLength(0);
  }, 120_000);
});
