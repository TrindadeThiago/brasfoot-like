import { describe, expect, it } from "vitest";
import type { CompletedBank } from "../../src/model/types";
import {
  isCountryMain,
  mainCompetitionOf,
  mainCompetitions,
  rulesCompetitionOf,
} from "../../src/world/countries";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateWorldBank } from "../../src/worldgen/world-example";

/** Banco de 2 países com um "estadual" listado ANTES da liga do primeiro país (023 R1). */
function worldWithRegionalFirst(): { bank: CompletedBank; regionalId: string; leagueId: string } {
  const base = completeHiddenAttributes(
    generateWorldBank({
      seed: "regional-main",
      countries: 2,
      divisionsPerCountry: 2,
      clubsPerDivision: 12,
      cup: false,
    }),
    "regional-main",
  );
  const league = base.competitions[0];
  if (!league) throw new Error("banco sem competição");
  const regional = { ...league, id: "estadual-teste", regional: { region: "Norte" } };
  return {
    bank: { ...base, competitions: [regional, ...base.competitions] },
    regionalId: regional.id,
    leagueId: league.id,
  };
}

describe("competição regional não é a principal do país (023 R1)", () => {
  const { bank, regionalId, leagueId } = worldWithRegionalFirst();
  const country = bank.competitions.find((entry) => entry.id === leagueId)?.countryId ?? "";

  it("mainCompetitionOf ignora o estadual mesmo listado antes da liga", () => {
    expect(mainCompetitionOf(bank, country)?.id).toBe(leagueId);
  });

  it("mainCompetitions devolve uma liga por país, sem o estadual", () => {
    const mains = mainCompetitions(bank);
    expect(mains).toHaveLength(2);
    expect(mains.map((entry) => entry.id)).not.toContain(regionalId);
  });

  it("isCountryMain é falso para o estadual e verdadeiro para a liga", () => {
    expect(isCountryMain(bank, regionalId)).toBe(false);
    expect(isCountryMain(bank, leagueId)).toBe(true);
  });

  it("as regras dos clubes continuam vindo da liga", () => {
    const club = bank.clubs.find((entry) => entry.countryId === country);
    expect(rulesCompetitionOf(bank, club?.id ?? "").id).toBe(leagueId);
  });
});
