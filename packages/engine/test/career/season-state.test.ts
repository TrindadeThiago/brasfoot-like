import { describe, expect, it } from "vitest";
import { createLeagueSeason } from "../../src/career/league";
import { calendarNext, createCareerSeason, leagueCalendar } from "../../src/career/season-state";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { competitionId, testWorld } from "./helpers";

describe("createCareerSeason (017 R4)", () => {
  it("banco de duas competições: a principal é a de hoje e a secundária tem seed própria", () => {
    const world = twoCompetitionsBank();
    const created = createCareerSeason(world, { careerSeed: "duas" });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    const alone = createLeagueSeason(world, {
      competitionId: competitionId(world),
      careerSeed: "duas",
    });
    if (!alone.ok) throw new Error("falhou");
    expect(created.league).toEqual(alone.league);
    expect(created.competitions).toHaveLength(1);
    const [tournament] = created.competitions;
    expect(tournament?.competitionId).toBe(TOURNAMENT_ID);
    expect(tournament?.seed).toBe(`duas:${TOURNAMENT_ID}`);
    expect(tournament?.divisions).toHaveLength(1);
    expect(tournament?.divisions[0]?.clubIds).toHaveLength(10);
    expect(created.fitness).toEqual({ players: {} });
  });

  it("calendário com as rodadas das duas competições e nenhum clube em dois jogos no dia", () => {
    const world = twoCompetitionsBank();
    const created = createCareerSeason(world, { careerSeed: "duas" });
    if (!created.ok) throw new Error("falhou");
    const { calendar } = created;
    expect(calendarNext(created)).toBe(0);
    expect(calendar.days.flatMap((day) => day.slots)).toHaveLength(38 + 18);
    const seasons = [created.league, ...created.competitions];
    for (const day of calendar.days) {
      const clubs: string[] = [];
      for (const slot of day.slots) {
        const season = seasons.find((entry) => entry.competitionId === slot.competitionId);
        for (const division of season?.divisions ?? []) {
          for (const fixture of division.calendar[slot.round - 1]?.fixtures ?? []) {
            clubs.push(fixture.home, fixture.away);
          }
        }
      }
      expect(new Set(clubs).size).toBe(clubs.length);
    }
  });

  it("é determinística", () => {
    const world = twoCompetitionsBank();
    expect(createCareerSeason(world, { careerSeed: "x" })).toEqual(
      createCareerSeason(world, { careerSeed: "x" }),
    );
  });

  it("banco padrão: sem secundárias e calendário igual ao da principal sozinha", () => {
    const world = testWorld();
    const created = createCareerSeason(world, { careerSeed: "padrao" });
    if (!created.ok) throw new Error("falhou");
    expect(created.competitions).toEqual([]);
    expect(created.calendar).toEqual(leagueCalendar(world, created.league));
  });

  it("respeita número e ano da temporada", () => {
    const world = testWorld();
    const created = createCareerSeason(world, { careerSeed: "padrao", number: 3, year: 2029 });
    if (!created.ok) throw new Error("falhou");
    expect(created.league.number).toBe(3);
    expect(created.calendar.start).toBe("2029-01-01");
    expect(created.calendar.days[0]?.date).toBe("2029-01-07");
  });
});
