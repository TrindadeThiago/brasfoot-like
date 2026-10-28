import { describe, expect, it } from "vitest";
import { GEO_COUNTRIES, NAME_BANKS } from "../../../src/worldgen/football-world";

describe("bancos de nomes por idioma (024 R3)", () => {
  it.each(Object.entries(NAME_BANKS))(
    "%s: nomes, sobrenomes e palavras de clube suficientes",
    (_id, bank) => {
      expect(bank.firstNames.length).toBeGreaterThanOrEqual(75);
      expect(bank.surnames.length).toBeGreaterThanOrEqual(75);
      expect(bank.clubPrefixes.length).toBeGreaterThanOrEqual(8);
      expect(bank.clubSuffixes.length).toBeGreaterThanOrEqual(8);
      expect(new Set(bank.firstNames).size).toBe(bank.firstNames.length);
      expect(new Set(bank.surnames).size).toBe(bank.surnames.length);
      for (const name of [...bank.firstNames, ...bank.surnames]) {
        expect(name.length).toBeGreaterThanOrEqual(1);
        expect(name.length).toBeLessThanOrEqual(30);
      }
    },
  );

  it("todo idioma citado na geografia tem banco", () => {
    for (const country of GEO_COUNTRIES) expect(NAME_BANKS[country.language]).toBeDefined();
  });

  it("nenhuma palavra de clube é nome distintivo de clube real (Princípio IV)", () => {
    const banned = [
      "spartak",
      "dinamo",
      "lokomotiv",
      "zenit",
      "borussia",
      "hertha",
      "gamba",
      "wydad",
    ];
    for (const bank of Object.values(NAME_BANKS)) {
      for (const word of [...bank.clubPrefixes, ...bank.clubSuffixes]) {
        expect(banned).not.toContain(word.toLowerCase());
      }
    }
  });
});
