// 027 US3: meses, semanas e contagens do calendário do clube.
import { describe, expect, it } from "vitest";
import { calendarMonths, monthOfNext } from "../../src/game/calendar-month";

const f = (date: string, id = date) => ({ date, id });

describe("calendarMonths (027)", () => {
  const fixtures = [
    f("2027-01-03"),
    f("2027-01-10"),
    f("2027-02-07"),
    f("2027-02-07", "copa"),
    f("2027-04-04"),
  ];
  const months = calendarMonths(fixtures, "2027-01-05", "2027-01-10");

  it("lista os meses do primeiro ao último jogo, inclusive os vazios no meio, com as contagens", () => {
    expect(months.map((month) => month.key)).toEqual(["2027-01", "2027-02", "2027-03", "2027-04"]);
    expect(months.map((month) => month.fixtureCount)).toEqual([2, 2, 0, 1]);
  });

  it("monta semanas completas de domingo a sábado", () => {
    const january = months[0];
    expect(january?.weeks.every((week) => week.length === 7)).toBe(true);
    // 1º de janeiro de 2027 é sexta: a primeira semana começa no domingo 27/12.
    expect(january?.weeks[0]?.[0]?.date).toBe("2026-12-27");
    expect(january?.weeks[0]?.[0]?.inMonth).toBe(false);
    expect(january?.weeks[0]?.[5]?.date).toBe("2027-01-01");
    expect(january?.weeks[0]?.[5]?.inMonth).toBe(true);
  });

  it("marca hoje e o próximo jogo e guarda todos os jogos de um dia", () => {
    const days = months.flatMap((month) => month.weeks.flat());
    expect(days.find((day) => day.isToday)?.date).toBe("2027-01-05");
    expect(days.find((day) => day.isNext)?.date).toBe("2027-01-10");
    const double = days.find((day) => day.date === "2027-02-07" && day.inMonth);
    expect(double?.fixtures.map((fixture) => fixture.id)).toEqual(["2027-02-07", "copa"]);
  });

  it("mês sem jogos tem a grade e contagem zero", () => {
    const march = months[2];
    expect(march?.fixtureCount).toBe(0);
    expect(march?.weeks.length).toBeGreaterThanOrEqual(4);
  });

  it("sem jogos não há meses", () => {
    expect(calendarMonths([], "2027-01-01")).toEqual([]);
  });

  it("abre no mês do próximo jogo; sem próximo, no último mês com jogos", () => {
    expect(monthOfNext(months, "2027-02-07")).toBe("2027-02");
    expect(monthOfNext(months, undefined)).toBe("2027-04");
    expect(monthOfNext(months, "2030-01-01")).toBe("2027-04");
  });

  it("não usa o relógio: o mesmo resultado em chamadas repetidas", () => {
    expect(calendarMonths(fixtures, "2027-01-05", "2027-01-10")).toEqual(months);
  });

  it("datas de alcance estendem os meses sem criar jogos (o filtro por competição)", () => {
    const filtered = calendarMonths([f("2027-01-03")], "2027-01-05", undefined, ["2027-03-14"]);
    expect(filtered.map((month) => month.key)).toEqual(["2027-01", "2027-02", "2027-03"]);
    expect(filtered.map((month) => month.fixtureCount)).toEqual([1, 0, 0]);
  });
});
