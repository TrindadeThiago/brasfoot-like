import { describe, expect, it } from "vitest";
import { dateOfRound } from "../../src/calendar/season-calendar";
import { isCalendarOver } from "../../src/career/season-state";
import { isRegionalOnly } from "../../src/regional/scope";
import { standings } from "../../src/season/standings";
import { playToEnd, regionalSeasons, regionalState } from "./regional-helpers";

describe("temporada com estaduais (023 US1)", () => {
  it("cria o estadual de cada região como competição secundária, com as duas divisões em fases", () => {
    const { state, world } = regionalState();
    const seasons = regionalSeasons(state);
    expect(seasons).toHaveLength(3);
    expect(state.competitions.map((entry) => entry.competitionId)).toEqual(
      expect.arrayContaining(seasons.map((entry) => entry.competitionId)),
    );
    for (const league of seasons) {
      expect(league.divisions.map((division) => division.divisionLevel)).toEqual([1, 2]);
      for (const division of league.divisions) {
        expect(division.stages).toBeDefined();
        const competition = world.competitions.find((entry) => entry.id === league.competitionId);
        const level = competition?.divisions.find(
          (entry) => entry.level === division.divisionLevel,
        );
        expect([...division.clubIds].sort()).toEqual([...(level?.clubIds ?? [])].sort());
      }
    }
  });

  it("a liga em foco é a principal do país, não o estadual", () => {
    const { state } = regionalState();
    expect(state.league.competitionId).toBe("liga-nacional");
  });

  it("o estadual acontece antes da liga: cada rodada nacional vem depois da última do estadual", () => {
    const { state } = regionalState();
    const dates = regionalSeasons(state)
      .flatMap((league) =>
        league.divisions.flatMap((division) =>
          Array.from({ length: division.calendar.length }, (_, index) =>
            dateOfRound(state.calendar, league.competitionId, index + 1),
          ),
        ),
      )
      .filter((date): date is string => date !== undefined)
      .sort();
    const lastRegional = dates.at(-1) ?? "";
    expect(lastRegional).not.toBe("");
    const firstNational = dateOfRound(state.calendar, state.league.competitionId, 1) ?? "";
    expect(firstNational > lastRegional).toBe(true);
  });

  it("joga a temporada inteira: há campeão em cada divisão e nenhum clube joga duas vezes no mesmo dia", () => {
    const { state, manager, seed } = regionalState();
    const end = playToEnd(state, seed, manager);
    expect(isCalendarOver(end)).toBe(true);
    const days = new Map<string, number>();
    for (const league of [end.league, ...end.competitions]) {
      for (const season of league.divisions) {
        for (const record of season.records) {
          const date = dateOfRound(end.calendar, league.competitionId, record.round);
          for (const club of [record.home, record.away]) {
            const key = `${club}|${date}`;
            days.set(key, (days.get(key) ?? 0) + 1);
          }
        }
      }
    }
    expect([...days.values()].filter((count) => count > 1)).toEqual([]);
    for (const league of regionalSeasons(end)) {
      for (const division of league.divisions) {
        expect(standings(division, end.world)[0]?.clubId).toBeDefined();
      }
    }
    // O banco é pequeno (3 estados): conferimos que há clube só regional jogando.
    expect(end.world.clubs.some((club) => isRegionalOnly(end.world, club.id))).toBe(true);
  }, 600_000);
});
