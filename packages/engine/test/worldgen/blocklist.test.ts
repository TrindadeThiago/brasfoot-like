import { describe, expect, it } from "vitest";
import { generateDefaultBank } from "../../src/worldgen/generate";
import nameBank from "../../src/worldgen/name-banks/default.json" with { type: "json" };
import blocklist from "../fixtures/blocklist.json" with { type: "json" };

const TERMS = [...blocklist.clubs, ...blocklist.competitions, ...blocklist.places];

function normalize(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

const NORMALIZED_TERMS = TERMS.map((term) => ({ term, normalized: normalize(term) }));

function blockedTermsIn(text: string): string[] {
  const normalized = normalize(text);
  return NORMALIZED_TERMS.filter(({ normalized: term }) => normalized.includes(term)).map(
    ({ term }) => term,
  );
}

describe("nenhum nome real (FR-037)", () => {
  it.each([1, 2, 3, 42, "brasfoot-like-default-1"])("banco gerado com seed %s", (seed) => {
    const bank = generateDefaultBank({ seed });
    const texts = [
      ...bank.countries.map((country) => country.name),
      ...bank.competitions.flatMap((competition) => [
        competition.name,
        ...competition.divisions.map((division) => division.name),
      ]),
      ...bank.clubs.flatMap((club) => [club.name, club.shortName, club.city]),
    ];
    const hits = texts.flatMap((text) => blockedTermsIn(text).map((term) => `${text} ⊃ ${term}`));
    expect(hits).toEqual([]);
  });

  it("o banco de nomes não contém termos bloqueados em cidades, clubes ou país", () => {
    const texts = [
      nameBank.countryName,
      nameBank.competitionName,
      ...nameBank.cities,
      ...nameBank.clubPrefixes,
      ...nameBank.clubSuffixes,
    ];
    const hits = texts.flatMap((text) => blockedTermsIn(text).map((term) => `${text} ⊃ ${term}`));
    expect(hits).toEqual([]);
  });
});
