import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { clubFixtures, nextClubFixture } from "../../src/career/season-state";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { MANAGER, newState } from "./day-helpers";

describe("nextClubFixture e clubFixtures (017 contracts/calendar-api.md)", () => {
  const world = twoCompetitionsBank();
  const mainId = world.competitions[0]?.id as string;

  it("lista todos os jogos do clube por data, das duas competições", () => {
    const state = newState(world, "jogos");
    const fixtures = clubFixtures(state, MANAGER);
    expect(fixtures).toHaveLength(38 + 18);
    const dates = fixtures.map((fixture) => fixture.date);
    expect([...dates].sort()).toEqual(dates);
    expect(fixtures.filter((fixture) => fixture.competitionId === TOURNAMENT_ID)).toHaveLength(18);
    expect(fixtures.every((fixture) => fixture.record === undefined)).toBe(true);
    for (const fixture of fixtures) {
      expect([fixture.home, fixture.away]).toContain(MANAGER);
    }
  });

  it("um clube fora do torneio só tem os jogos da liga", () => {
    const state = newState(world, "jogos");
    const fixtures = clubFixtures(state, "clube-040");
    expect(fixtures).toHaveLength(38);
    expect(new Set(fixtures.map((fixture) => fixture.competitionId))).toEqual(new Set([mainId]));
    expect(fixtures.every((fixture) => fixture.divisionLevel === 2)).toBe(true);
  });

  it("o próximo jogo é o primeiro ainda não disputado", () => {
    const state = newState(world, "jogos");
    const first = nextClubFixture(state, MANAGER);
    expect(first).toMatchObject({ date: "2027-01-03", competitionId: mainId, round: 1, day: 0 });
    const played = advanceCareerDays(state, { days: 3 }, "jogos", MANAGER);
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    // Domingo, domingo, quarta: o 4º dia é domingo de novo.
    const next = nextClubFixture(played.state, MANAGER);
    expect(next).toMatchObject({ date: "2027-01-17", competitionId: mainId, round: 3, day: 3 });
  });

  it("os jogos disputados trazem o registro da partida", () => {
    const state = newState(world, "jogos");
    const played = advanceCareerDays(state, { days: 3 }, "jogos", MANAGER);
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const fixtures = clubFixtures(played.state, MANAGER);
    expect(fixtures.slice(0, 3).map((fixture) => fixture.record !== undefined)).toEqual([
      true,
      true,
      true,
    ]);
    expect(fixtures[2]?.competitionId).toBe(TOURNAMENT_ID);
    expect(fixtures[2]?.record?.home).toBe(fixtures[2]?.home);
    expect(fixtures.slice(3).every((fixture) => fixture.record === undefined)).toBe(true);
  });

  it("sem jogos restantes, não há próximo jogo", () => {
    const state = newState(world, "jogos");
    const over = advanceCareerDays(state, { toEnd: true }, "jogos", MANAGER);
    if (!over.ok) throw new Error(JSON.stringify(over.error));
    expect(nextClubFixture(over.state, MANAGER)).toBeUndefined();
  });
});
