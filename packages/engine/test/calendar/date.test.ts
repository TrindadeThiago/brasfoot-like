import { describe, expect, it } from "vitest";
import {
  ageOn,
  civilFromDays,
  daysFromCivil,
  formatIsoDate,
  parseIsoDate,
} from "../../src/calendar/date";

describe("parseIsoDate", () => {
  it("aceita datas válidas, inclusive 29/02 em ano bissexto", () => {
    expect(parseIsoDate("2024-02-29")).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseIsoDate("2000-02-29")).toEqual({ year: 2000, month: 2, day: 29 });
    expect(parseIsoDate("2027-12-31")).toEqual({ year: 2027, month: 12, day: 31 });
  });

  it("rejeita datas inválidas ou mal formatadas", () => {
    for (const value of [
      "2023-02-29",
      "1900-02-29",
      "2024-13-01",
      "2024-00-10",
      "2024-04-31",
      "2024-1-01",
      "24-01-01",
      "2024-01-01T00:00",
      "",
    ]) {
      expect(parseIsoDate(value)).toBeNull();
    }
  });
});

describe("dias desde a época", () => {
  it("1970-01-01 é o dia 0", () => {
    expect(daysFromCivil({ year: 1970, month: 1, day: 1 })).toBe(0);
  });

  it("faz ida e volta de 1900 a 2100", () => {
    const start = daysFromCivil({ year: 1900, month: 1, day: 1 });
    const end = daysFromCivil({ year: 2100, month: 12, day: 31 });
    for (let day = start; day <= end; day++) {
      expect(daysFromCivil(civilFromDays(day))).toBe(day);
    }
    expect(end - start + 1).toBe(73414);
  });

  it("formatIsoDate é o inverso de parseIsoDate", () => {
    expect(formatIsoDate({ year: 2001, month: 5, day: 7 })).toBe("2001-05-07");
    expect(formatIsoDate(civilFromDays(daysFromCivil({ year: 2024, month: 2, day: 29 })))).toBe(
      "2024-02-29",
    );
  });
});

describe("ageOn", () => {
  it("conta anos completos", () => {
    expect(ageOn("2000-05-17", "2027-05-17")).toBe(27);
    expect(ageOn("2000-05-17", "2027-05-16")).toBe(26);
    expect(ageOn("2000-05-17", "2027-01-01")).toBe(26);
  });

  it("trata nascidos em 29/02", () => {
    expect(ageOn("2004-02-29", "2027-02-28")).toBe(22);
    expect(ageOn("2004-02-29", "2027-03-01")).toBe(23);
    expect(ageOn("2004-02-29", "2028-02-29")).toBe(24);
  });

  it("lança erro para datas inválidas", () => {
    expect(() => ageOn("2023-02-29", "2027-01-01")).toThrow();
  });
});
