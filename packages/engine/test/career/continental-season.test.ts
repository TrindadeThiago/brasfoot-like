import { describe, expect, it } from "vitest";
import { dateOfRound } from "../../src/calendar/season-calendar";
import { isCalendarOver } from "../../src/career/season-state";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import {
  compactState,
  continentalChampion,
  continentalLeague,
  playDays,
} from "./continental-helpers";
import { allSeasons } from "./qualification-helpers";

describe("temporada com a taça continental (022 US1)", () => {
  it("a competição entre países é criada junto das nacionais, com os 16 clubes do banco", () => {
    const { state } = compactState();
    const league = continentalLeague(state);
    expect(state.competitions.map((entry) => entry.competitionId)).toContain(CONTINENTAL_IDS.major);
    expect(league.divisions[0]?.clubIds).toHaveLength(16);
    const countries = new Set(
      league.divisions[0]?.clubIds.map(
        (id) => state.world.clubs.find((club) => club.id === id)?.countryId,
      ),
    );
    expect(countries.size).toBe(5);
  });

  it("nenhum clube joga duas vezes no mesmo dia, em nenhuma competição", () => {
    const { state, manager, seed } = compactState();
    const end = playDays(state, "end", seed, manager);
    const days = new Map<string, number>();
    for (const league of allSeasons(end)) {
      for (const season of league.divisions) {
        for (const record of season.records) {
          const date = dateOfRound(end.calendar, league.competitionId, record.round);
          expect(date).toBeDefined();
          for (const club of [record.home, record.away]) {
            const key = `${club}|${date}`;
            days.set(key, (days.get(key) ?? 0) + 1);
          }
        }
      }
    }
    expect([...days.values()].filter((count) => count > 1)).toEqual([]);
  }, 300_000);

  it("a temporada só termina depois da final e há um campeão", () => {
    const { state, manager, seed } = compactState();
    const end = playDays(state, "end", seed, manager);
    expect(isCalendarOver(end)).toBe(true);
    const league = continentalLeague(end);
    const season = league.divisions[0];
    expect(season && season.nextRound > season.calendar.length).toBe(true);
    expect(continentalChampion(end)).toBeDefined();
    const lastContinental = Math.max(
      ...end.calendar.days
        .filter((day) => day.slots.some((slot) => slot.competitionId === CONTINENTAL_IDS.major))
        .map((day) => end.calendar.days.indexOf(day)),
    );
    expect(lastContinental).toBeGreaterThan(0);
  }, 300_000);

  it("duas execuções da mesma seed dão o mesmo resultado", () => {
    const first = compactState();
    const second = compactState();
    const a = playDays(first.state, "end", first.seed, first.manager);
    const b = playDays(second.state, "end", second.seed, second.manager);
    expect(JSON.stringify(continentalLeague(a))).toBe(JSON.stringify(continentalLeague(b)));
    expect(continentalChampion(a)).toBe(continentalChampion(b));
  }, 300_000);

  it("salvar e carregar no meio da fase de grupos não muda o resultado", () => {
    const { state, manager, seed } = compactState();
    const direct = playDays(state, "end", seed, manager);
    // Dias suficientes para estar dentro da fase de grupos (as rodadas são semanais).
    const middle = playDays(state, 8, seed, manager);
    const season = continentalLeague(middle).divisions[0];
    expect(season?.stages?.[0]?.kind).toBe("groups");
    expect(
      season &&
        season.nextRound > 1 &&
        season.nextRound <= (season.stages?.[0]?.rounds.at(-1) ?? 0),
    ).toBe(true);
    const restored = JSON.parse(JSON.stringify(middle)) as typeof middle;
    const resumed = playDays(restored, "end", seed, manager);
    expect(JSON.stringify(continentalLeague(resumed))).toBe(
      JSON.stringify(continentalLeague(direct)),
    );
  }, 300_000);
});
