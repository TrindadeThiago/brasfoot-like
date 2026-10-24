import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { calendarNext, isCalendarOver } from "../../src/career/season-state";
import { isCountryMain } from "../../src/world/countries";
import { worldLeagues } from "../../src/world/create";
import { mainLeagueOfClub, switchManagerCountry } from "../../src/world/leagues";
import { clubOfCountry, worldBank, worldState } from "../career/world-helpers";

const SEED = "troca";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("ligas do mundo e troca de país (020 R2)", () => {
  const world = worldBank({ cup: true });
  const manager = clubOfCountry(world, 0);
  const abroad = clubOfCountry(world, 2);

  it("worldLeagues traz a do técnico primeiro e as dos outros países na ordem do banco", () => {
    const state = worldState(world, SEED, manager);
    const leagues = worldLeagues(world, state);
    expect(leagues).toHaveLength(3);
    expect(leagues[0]).toBe(state.league);
    expect(leagues.every((league) => isCountryMain(world, league.competitionId))).toBe(true);
    const rest = leagues.slice(1).map((league) => league.competitionId);
    expect(rest).toEqual(
      world.competitions
        .filter(
          (entry) => isCountryMain(world, entry.id) && entry.id !== state.league.competitionId,
        )
        .map((entry) => entry.id),
    );
  });

  it("mainLeagueOfClub acha a liga principal do país do clube", () => {
    const state = worldState(world, SEED, manager);
    expect(mainLeagueOfClub(state, manager)?.competitionId).toBe(state.league.competitionId);
    const other = mainLeagueOfClub(state, abroad);
    expect(other).toBeDefined();
    expect(other?.competitionId).not.toBe(state.league.competitionId);
    expect(mainLeagueOfClub(state, "inexistente")).toBeUndefined();
  });

  it("troca os papéis das ligas e mantém `competitions` na ordem do banco, sem alterar a entrada", () => {
    const state = worldState(world, SEED, manager);
    const before = JSON.stringify(state);
    const switched = switchManagerCountry(state, abroad);
    expect(JSON.stringify(state)).toBe(before);
    expect(switched.league.competitionId).toBe(mainLeagueOfClub(state, abroad)?.competitionId);
    const ids = switched.competitions.map((entry) => entry.competitionId);
    expect(ids).toContain(state.league.competitionId);
    expect(ids).not.toContain(switched.league.competitionId);
    const order = world.competitions.map((entry) => entry.id);
    expect(ids).toEqual(order.filter((id) => ids.includes(id)));
    expect([switched.league, ...switched.competitions].map((e) => e.competitionId).sort()).toEqual(
      [...order].sort(),
    );
  });

  it("clube do mesmo país não muda nada", () => {
    const state = worldState(world, SEED, manager);
    expect(switchManagerCountry(state, manager)).toBe(state);
    expect(switchManagerCountry(state, "inexistente")).toBe(state);
  });

  it("a temporada continua depois da troca no meio dela, sem rodada perdida nem repetida", () => {
    const state = worldState(world, SEED, manager);
    const half = ok(advanceCareerDays(state, { days: 6 }, SEED, manager)).state;
    const switched = switchManagerCountry(half, abroad);
    const day = calendarNext(half);
    expect(calendarNext(switched)).toBe(day);
    const direct = ok(advanceCareerDays(half, { toEnd: true }, SEED, manager)).state;
    const after = ok(advanceCareerDays(switched, { toEnd: true }, SEED, abroad)).state;
    expect(isCalendarOver(after)).toBe(true);
    const roundsOf = (s: typeof after) =>
      Object.fromEntries(
        [s.league, ...s.competitions].map((league) => [
          league.competitionId,
          league.divisions.map((season) => season.records.length),
        ]),
      );
    expect(roundsOf(after)).toEqual(roundsOf(direct));
  }, 120_000);
});
