import { describe, expect, it } from "vitest";
import { weekdayOf } from "../../src/calendar/date";
import { DEFAULT_SCHEDULE, roundDates, scheduleOf } from "../../src/calendar/schedule";
import { editedWorld, testWorld } from "../career/helpers";

describe("agenda da competição (017 R1)", () => {
  it("o padrão é uma rodada por domingo, a partir do início", () => {
    expect(DEFAULT_SCHEDULE).toEqual({ weekday: 7, startWeek: 0, everyWeeks: 1 });
  });

  it("scheduleOf usa o padrão sem `schedule` e completa campos ausentes", () => {
    const world = testWorld();
    const id = world.competitions[0]?.id as string;
    expect(scheduleOf(world, id)).toEqual(DEFAULT_SCHEDULE);
    const edited = editedWorld((copy) => {
      (copy.competitions[0] as { schedule?: unknown }).schedule = { weekday: 3, everyWeeks: 2 };
    });
    expect(scheduleOf(edited, id)).toEqual({ weekday: 3, startWeek: 0, everyWeeks: 2 });
  });

  it("scheduleOf recusa competição inexistente", () => {
    expect(() => scheduleOf(testWorld(), "nao-existe")).toThrow();
  });

  it("roundDates: a primeira rodada cai no primeiro dia da semana a partir do início", () => {
    // 2027-01-01 é sexta-feira.
    const [first, second] = roundDates(DEFAULT_SCHEDULE, "2027-01-01", 3);
    expect(first).toBe("2027-01-03");
    expect(second).toBe("2027-01-10");
    expect(roundDates({ weekday: 3, startWeek: 0, everyWeeks: 1 }, "2027-01-01", 1)).toEqual([
      "2027-01-06",
    ]);
  });

  it("roundDates: início já no dia da semana conta como semana 0", () => {
    expect(roundDates({ weekday: 5, startWeek: 0, everyWeeks: 1 }, "2027-01-01", 2)).toEqual([
      "2027-01-01",
      "2027-01-08",
    ]);
  });

  it("roundDates: startWeek desloca e everyWeeks espaça as rodadas em 7 × everyWeeks dias", () => {
    const dates = roundDates({ weekday: 3, startWeek: 1, everyWeeks: 2 }, "2027-01-01", 4);
    expect(dates).toEqual(["2027-01-13", "2027-01-27", "2027-02-10", "2027-02-24"]);
    for (const date of dates) expect(weekdayOf(date)).toBe(3);
  });

  it("roundDates com zero rodadas devolve lista vazia", () => {
    expect(roundDates(DEFAULT_SCHEDULE, "2027-01-01", 0)).toEqual([]);
  });
});
