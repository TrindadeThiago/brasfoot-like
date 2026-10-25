import { describe, expect, it } from "vitest";
import {
  isCountryMain,
  mainCompetitions,
  matchRulesCompetition,
  rulesCompetitionOf,
} from "../../src/world/countries";
import { CONTINENTAL_ID, continentalPackage } from "../fixtures/continental-bank";

// Só `competitions`, `clubs` e `countries` são lidos pelas consultas de países.
const world = continentalPackage() as unknown as Parameters<typeof rulesCompetitionOf>[0];

describe("regras do país numa competição entre países (022 R1)", () => {
  it("a competição sem país não é a principal de nenhum país", () => {
    expect(isCountryMain(world, CONTINENTAL_ID)).toBe(false);
    const mains = mainCompetitions(world);
    expect(mains).toHaveLength(world.countries.length);
    expect(mains.map((main) => main.id)).not.toContain(CONTINENTAL_ID);
  });

  it("as regras do clube vêm da principal do país dele", () => {
    for (const club of world.clubs) {
      const main = rulesCompetitionOf(world, club.id);
      expect(main.countryId).toBe(club.countryId);
    }
  });

  it("num jogo continental valem as regras do país do mandante", () => {
    const [first, second] = world.countries;
    const home = world.clubs.find((club) => club.countryId === second?.id);
    expect(home).toBeDefined();
    const rules = matchRulesCompetition(world, CONTINENTAL_ID, home?.id ?? "");
    expect(rules.countryId).toBe(second?.id);
    expect(rules.countryId).not.toBe(first?.id);
  });

  it("numa competição nacional valem as regras do país da competição", () => {
    const [national] = world.competitions;
    const foreign = world.clubs.find((club) => club.countryId !== national?.countryId);
    const rules = matchRulesCompetition(world, national?.id ?? "", foreign?.id ?? "");
    expect(rules.id).toBe(national?.id);
  });
});
