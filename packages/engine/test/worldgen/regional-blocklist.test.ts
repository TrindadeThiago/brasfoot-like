import { describe, expect, it } from "vitest";
import { generateRegionalBank } from "../../src/worldgen/regional";
import blocklist from "../fixtures/blocklist.json" with { type: "json" };

// 023 (T065, FR-037): estados, estaduais e clubes gerados não contêm nomes reais.
const TERMS = [...blocklist.clubs, ...blocklist.competitions, ...blocklist.places];

function normalize(text: string): string {
  return ` ${text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

const NORMALIZED = TERMS.map((term) => ({ term, normalized: normalize(term) }));

function blockedIn(text: string): string[] {
  const normalized = normalize(text);
  return NORMALIZED.filter(({ normalized: term }) => normalized.includes(term)).map(
    ({ term }) => term,
  );
}

describe("nenhum nome real nos estaduais (FR-037)", () => {
  it.each(["estaduais-1", "estaduais-2", "estadual-exemplo-1"])(
    "banco gerado com seed %s",
    (seed) => {
      const bank = generateRegionalBank({ seed });
      const texts = [
        ...bank.countries.map((country) => country.name),
        ...bank.competitions.flatMap((competition) => [
          competition.name,
          competition.regional?.region ?? "",
          ...competition.divisions.map((division) => division.name),
        ]),
        ...bank.clubs.flatMap((club) => [club.name, club.shortName, club.city, club.region ?? ""]),
      ];
      const hits = texts.flatMap((text) => blockedIn(text).map((term) => `${text} ⊃ ${term}`));
      expect(hits).toEqual([]);
    },
  );
});
