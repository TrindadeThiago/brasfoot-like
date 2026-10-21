import { describe, expect, it } from "vitest";
import { addDays, diffDays, weekdayOf } from "../../src/calendar/date";
import { advanceLeague } from "../../src/career/league-round";
import { calendarNext, isCalendarOver, leagueCalendar } from "../../src/career/season-state";
import { newLeague, testWorld } from "./helpers";

describe("leagueCalendar: calendário só da competição principal (017 R12)", () => {
  const world = testWorld();

  it("uma rodada por domingo a partir do início da temporada, na ordem das rodadas", () => {
    const league = newLeague("cal");
    const calendar = leagueCalendar(world, league);
    expect(calendar.start).toBe("2027-01-01");
    expect(calendar.end).toBe(addDays(calendar.start, 363));
    expect(calendar.days).toHaveLength(38);
    expect(calendar.days[0]?.date).toBe("2027-01-03");
    calendar.days.forEach((day, index) => {
      expect(weekdayOf(day.date)).toBe(7);
      expect(day.slots).toEqual([{ competitionId: league.competitionId, round: index + 1 }]);
      if (index > 0) expect(diffDays(calendar.days[index - 1]?.date ?? "", day.date)).toBe(7);
    });
    expect(calendarNext({ league, competitions: [], calendar })).toBe(0);
  });

  it("o próximo dia acompanha as rodadas já jogadas e termina com a temporada", () => {
    const league = newLeague("cal");
    const played = advanceLeague(league, world, { rounds: 17 });
    if (!played.ok) throw new Error("falhou");
    const midway = {
      league: played.league,
      competitions: [],
      calendar: leagueCalendar(world, played.league),
    };
    expect(calendarNext(midway)).toBe(17);
    const over = advanceLeague(league, world, { toEnd: true });
    if (!over.ok) throw new Error("falhou");
    const finished = {
      league: over.league,
      competitions: [],
      calendar: leagueCalendar(world, over.league),
    };
    expect(isCalendarOver(finished)).toBe(true);
  });
});
