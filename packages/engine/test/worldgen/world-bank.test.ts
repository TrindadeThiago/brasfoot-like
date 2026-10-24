import { describe, expect, it } from "vitest";
import { validateBank } from "../../src/validation/validate";
import { generateWorldBank } from "../../src/worldgen/world-example";
import blocklist from "../fixtures/blocklist.json" with { type: "json" };

const SEED = "mundo-teste-1";

function normalize(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

describe("banco de vários países (020 R10)", () => {
  const bank = generateWorldBank({
    seed: SEED,
    countries: 10,
    divisionsPerCountry: 2,
    clubsPerDivision: 20,
  });

  it("10 países × 2 divisões × 20 clubes = 400 clubes, válido", () => {
    expect(bank.countries).toHaveLength(10);
    expect(bank.competitions).toHaveLength(10);
    expect(bank.clubs).toHaveLength(400);
    expect(bank.players.length).toBeGreaterThan(400 * 22);
    expect(validateBank(JSON.parse(JSON.stringify(bank))).ok).toBe(true);
  });

  it("ids, siglas e códigos únicos; clubes e jogadores com prefixo do país", () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(bank.clubs.map((club) => club.id))).toBe(true);
    expect(unique(bank.clubs.map((club) => club.abbreviation))).toBe(true);
    expect(unique(bank.players.map((player) => player.id))).toBe(true);
    expect(unique(bank.countries.map((country) => country.code))).toBe(true);
    for (const country of bank.countries) {
      const prefix = `clube-${country.code.toLowerCase()}-`;
      const own = bank.clubs.filter((club) => club.countryId === country.id);
      expect(own).toHaveLength(40);
      expect(own.every((club) => club.id.startsWith(prefix))).toBe(true);
    }
  });

  it("cada país tem a sua competição principal e o seu banco de nomes", () => {
    for (const country of bank.countries) {
      const own = bank.competitions.filter((entry) => entry.countryId === country.id);
      expect(own).toHaveLength(1);
      expect(own[0]?.divisions).toHaveLength(2);
      expect(country.names?.firstNames.length).toBeGreaterThanOrEqual(200);
    }
    const first = bank.countries.map((country) => country.names?.firstNames[0]);
    expect(new Set(first).size).toBeGreaterThan(5);
  });

  it("economia diferente por país, mesma agenda", () => {
    const wages = bank.competitions.map((entry) => entry.economy?.wageFactorPct);
    expect(Math.min(...(wages as number[]))).toBeLessThan(85);
    expect(Math.max(...(wages as number[]))).toBeGreaterThan(115);
    const schedules = new Set(bank.competitions.map((entry) => JSON.stringify(entry.schedule)));
    expect(schedules.size).toBe(1);
  });

  it("determinístico por seed e diferente com outra", () => {
    const again = generateWorldBank({
      seed: SEED,
      countries: 10,
      divisionsPerCountry: 2,
      clubsPerDivision: 20,
    });
    expect(JSON.stringify(again)).toBe(JSON.stringify(bank));
    const other = generateWorldBank({
      seed: "outra",
      countries: 2,
      divisionsPerCountry: 2,
      clubsPerDivision: 20,
    });
    expect(other.countries[0]?.name).not.toBe(bank.countries[0]?.name);
  });

  it("uma divisão por país e a copa nacional opcional", () => {
    const small = generateWorldBank({
      seed: SEED,
      countries: 3,
      divisionsPerCountry: 1,
      clubsPerDivision: 12,
      cup: true,
    });
    expect(small.clubs).toHaveLength(36);
    expect(small.competitions).toHaveLength(6);
    expect(small.competitions.filter((entry) => entry.format.type === "knockout")).toHaveLength(3);
  });

  it("nenhum nome real nos países, competições e clubes", () => {
    const terms = [...blocklist.clubs, ...blocklist.competitions, ...blocklist.places].map((term) =>
      normalize(term),
    );
    const texts = [
      ...bank.countries.map((country) => country.name),
      ...bank.competitions.map((competition) => competition.name),
      ...bank.clubs.flatMap((club) => [club.name, club.shortName, club.city]),
    ];
    const hits = texts.filter((text) => terms.some((term) => normalize(text).includes(term)));
    expect(hits).toEqual([]);
  });
});
