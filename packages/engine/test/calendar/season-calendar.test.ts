import { describe, expect, it } from "vitest";
import { diffDays, weekdayOf } from "../../src/calendar/date";
import {
  buildSeasonCalendar,
  calendarCompetitions,
  dateOfRound,
  dayIndexAfter,
} from "../../src/calendar/season-calendar";
import {
  outsideMain,
  overflow,
  sameWeekday,
  TOURNAMENT_ID,
  twoCompetitionsBank,
} from "../fixtures/two-competitions";
import { testWorld } from "../season/helpers/world";

const START = "2027-01-01";

function build(world = testWorld()) {
  return buildSeasonCalendar(calendarCompetitions(world.competitions), START);
}

describe("buildSeasonCalendar (017 R3)", () => {
  it("banco padrão: 38 dias, um slot por dia, domingos consecutivos", () => {
    const result = build();
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const { calendar } = result;
    const mainId = testWorld().competitions[0]?.id;
    expect(calendar.start).toBe(START);
    expect(calendar.end).toBe("2027-12-30");
    expect(calendar.days).toHaveLength(38);
    calendar.days.forEach((day, index) => {
      expect(weekdayOf(day.date)).toBe(7);
      expect(day.slots).toEqual([{ competitionId: mainId, round: index + 1 }]);
    });
    expect(calendar.days[0]?.date).toBe("2027-01-03");
  });

  it("duas competições: domingos e quartas intercalados, dias ordenados, slots na ordem do banco", () => {
    const world = twoCompetitionsBank();
    const result = build(world);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    const { days } = result.calendar;
    const mainId = world.competitions[0]?.id as string;
    const dates = days.map((day) => day.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
    expect(days.flatMap((day) => day.slots)).toHaveLength(38 + 18);
    for (const day of days) {
      const expected = day.slots[0]?.competitionId === mainId ? 7 : 3;
      expect(weekdayOf(day.date)).toBe(expected);
    }
    const seen = new Set(
      days.flatMap((day) => day.slots.map((s) => `${s.competitionId}#${s.round}`)),
    );
    expect(seen.size).toBe(56);
    // Primeira quarta da torneio: semana 1 depois da primeira quarta (2027-01-06).
    expect(dateOfRound(result.calendar, TOURNAMENT_ID, 1)).toBe("2027-01-13");
    expect(dateOfRound(result.calendar, TOURNAMENT_ID, 2)).toBe("2027-01-27");
    expect(diffDays("2027-01-03", dateOfRound(result.calendar, mainId, 1) as string)).toBe(0);
  });

  it("é determinística", () => {
    const world = twoCompetitionsBank();
    expect(build(world)).toEqual(build(world));
  });

  it("competições no mesmo dia sem clubes em comum agrupam os slots na ordem do banco", () => {
    const sunday = { weekday: 7, startWeek: 0, everyWeeks: 1 };
    const result = buildSeasonCalendar(
      [
        { competitionId: "a", rounds: 3, clubIds: ["c1", "c2"], schedule: sunday },
        { competitionId: "b", rounds: 2, clubIds: ["c3", "c4"], schedule: sunday },
      ],
      START,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    expect(result.calendar.days.map((day) => day.slots)).toEqual([
      [
        { competitionId: "a", round: 1 },
        { competitionId: "b", round: 1 },
      ],
      [
        { competitionId: "a", round: 2 },
        { competitionId: "b", round: 2 },
      ],
      [{ competitionId: "a", round: 3 }],
    ]);
  });

  it("mesmo dia da semana com clubes em comum ⇒ club_double_booked na primeira data em comum", () => {
    const world = twoCompetitionsBank(sameWeekday);
    const result = build(world);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([
      {
        code: "calendar.club_double_booked",
        competitionId: TOURNAMENT_ID,
        otherCompetitionId: world.competitions[0]?.id,
        clubId: "clube-001",
        date: "2027-01-10",
      },
    ]);
  });

  it("competição que não cabe nas 52 semanas ⇒ competition_overflow", () => {
    const result = build(twoCompetitionsBank(overflow));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual({
      code: "calendar.competition_overflow",
      competitionId: TOURNAMENT_ID,
      needed: 75,
      available: 52,
    });
  });

  it("um clube só da secundária não gera erro de calendário (é regra de referência)", () => {
    const result = build(twoCompetitionsBank(outsideMain));
    expect(result.ok).toBe(true);
  });
});

describe("dateOfRound e dayIndexAfter", () => {
  const result = build();
  if (!result.ok) throw new Error("falhou");
  const { calendar } = result;
  const mainId = testWorld().competitions[0]?.id as string;

  it("dateOfRound acha a data da rodada ou nada", () => {
    expect(dateOfRound(calendar, mainId, 38)).toBe(calendar.days[37]?.date);
    expect(dateOfRound(calendar, mainId, 39)).toBeUndefined();
    expect(dateOfRound(calendar, "outra", 1)).toBeUndefined();
  });

  it("dayIndexAfter acha o primeiro dia com alguma rodada ainda não fechada", () => {
    expect(dayIndexAfter(calendar, {})).toBe(0);
    expect(dayIndexAfter(calendar, { [mainId]: 0 })).toBe(0);
    expect(dayIndexAfter(calendar, { [mainId]: 10 })).toBe(10);
    expect(dayIndexAfter(calendar, { [mainId]: 38 })).toBe(38);
  });

  it("um dia com várias competições só passa quando todas fecharam a rodada", () => {
    const merged = {
      ...calendar,
      days: [
        {
          date: "2027-01-03",
          slots: [
            { competitionId: "a", round: 1 },
            { competitionId: "b", round: 1 },
          ],
        },
      ],
    };
    expect(dayIndexAfter(merged, { a: 1 })).toBe(0);
    expect(dayIndexAfter(merged, { a: 1, b: 1 })).toBe(1);
  });
});
