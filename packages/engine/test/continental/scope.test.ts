import { describe, expect, it } from "vitest";
import {
  internationalCompetitions,
  isInternational,
  participantCountries,
} from "../../src/continental/scope";
import { CONTINENTAL_ID, continentalPackage } from "../fixtures/continental-bank";

describe("escopo das competições entre países (022)", () => {
  const bank = continentalPackage();

  it("só a competição sem país é internacional", () => {
    const international = internationalCompetitions(bank);
    expect(international.map((competition) => competition.id)).toEqual([CONTINENTAL_ID]);
    expect(bank.competitions.filter((competition) => !isInternational(competition))).toHaveLength(
      3,
    );
  });

  it("os países dos participantes seguem a ordem do banco e não se repetem", () => {
    const countries = participantCountries(bank, CONTINENTAL_ID);
    expect(countries).toEqual(bank.countries.map((country) => country.id));
    expect(new Set(countries).size).toBe(countries.length);
  });

  it("competição inexistente ou nacional não tem países de uma disputa entre países", () => {
    expect(participantCountries(bank, "nao-existe")).toEqual([]);
    const national = bank.competitions[0];
    expect(participantCountries(bank, national?.id ?? "")).toEqual([national?.countryId]);
  });
});
