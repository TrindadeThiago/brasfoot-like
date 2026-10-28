import { describe, expect, it } from "vitest";
import {
  COMPACT_PROFILE,
  DEFAULT_PROFILE,
  generateFootballWorld,
} from "../../../src/worldgen/football-world";
import { continentalSize } from "../../../src/worldgen/football-world/confederation";

describe("confederações (024 R7)", () => {
  it("tamanho da competição: completa com 8 países ou mais", () => {
    expect(continentalSize(12)).toBe("full");
    expect(continentalSize(6)).toBe("compact");
    expect(continentalSize(4)).toBe("compact");
  });

  it("cada confederação só reúne clubes dos próprios países; as seis são independentes", () => {
    const bank = generateFootballWorld(COMPACT_PROFILE, "conf");
    const countryOfClub = new Map(bank.clubs.map((c) => [c.id, c.countryId]));
    const seen = new Map<string, string>();
    for (const confederation of COMPACT_PROFILE.confederations) {
      const countries = new Set(confederation.countries.map((c) => c.geoId));
      const major = bank.competitions.find((c) => c.id === `continental-${confederation.id}-maior`);
      expect(major).toBeDefined();
      for (const id of major?.divisions[0]?.clubIds ?? []) {
        expect(countries.has(countryOfClub.get(id) ?? "")).toBe(true);
        expect(seen.get(id)).toBeUndefined();
        seen.set(id, confederation.id);
      }
    }
  });

  it("o perfil padrão: UEFA e CONMEBOL têm a competição principal e a secundária ligadas", () => {
    const bank = generateFootballWorld(DEFAULT_PROFILE, "padrao");
    for (const id of ["uefa", "conmebol"]) {
      const minor = bank.competitions.find((c) => c.id === `continental-${id}-menor`);
      expect(minor?.divisions[0]?.dropIns?.[0]?.source.competitionId).toBe(
        `continental-${id}-maior`,
      );
    }
    expect(bank.competitions.some((c) => c.id === "continental-ofc-menor")).toBe(false);
  });

  it("as vagas seguem a força: o país mais forte tem ao menos tantos clubes quanto o mais fraco", () => {
    const bank = generateFootballWorld(DEFAULT_PROFILE, "vagas");
    const countryOfClub = new Map(bank.clubs.map((c) => [c.id, c.countryId]));
    const major = bank.competitions.find((c) => c.id === "continental-uefa-maior");
    const counts = new Map<string, number>();
    for (const id of major?.divisions[0]?.clubIds ?? []) {
      const country = countryOfClub.get(id) ?? "";
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
    expect(counts.get("inglaterra") ?? 0).toBeGreaterThanOrEqual(counts.get("suica") ?? 0);
  });
});
