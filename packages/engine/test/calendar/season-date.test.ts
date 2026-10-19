import { describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";

describe("data da temporada (R6)", () => {
  it("troca só o ano", () => {
    expect(seasonDate("2027-01-01", 2031)).toBe("2031-01-01");
    expect(seasonDate("2027-07-15", 2027)).toBe("2027-07-15");
  });

  it("29/02 vira 28/02 em ano não bissexto", () => {
    expect(seasonDate("2028-02-29", 2029)).toBe("2029-02-28");
    expect(seasonDate("2028-02-29", 2032)).toBe("2032-02-29");
  });

  it.each(["1999-12-31", "2004-01-01", "2000-02-29", "2010-06-15"])(
    "quem nasceu em %s fica um ano mais velho a cada temporada",
    (birthDate) => {
      for (const year of [2027, 2028, 2029, 2030]) {
        expect(ageOn(birthDate, seasonDate("2027-01-01", year + 1))).toBe(
          ageOn(birthDate, seasonDate("2027-01-01", year)) + 1,
        );
      }
    },
  );

  it("recusa data inválida", () => {
    expect(() => seasonDate("2027-13-01", 2028)).toThrow();
  });
});
