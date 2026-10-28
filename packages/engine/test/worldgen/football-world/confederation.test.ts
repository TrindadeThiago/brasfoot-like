import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, generateFootballWorld } from "../../../src/worldgen/football-world";
import { continentalSize } from "../../../src/worldgen/football-world/confederation";

describe("confederações (024 R7)", () => {
  it("tamanho da competição: completa com 8 países ou mais", () => {
    expect(continentalSize(12)).toBe("full");
    expect(continentalSize(6)).toBe("compact");
    expect(continentalSize(4)).toBe("compact");
    expect(continentalSize(3)).toBe("mini");
  });

  it("cada confederação só reúne clubes dos próprios países; as cinco são independentes", () => {
    const bank = generateFootballWorld(DEFAULT_PROFILE, "conf");
    const countryOfClub = new Map(bank.clubs.map((c) => [c.id, c.countryId]));
    const seen = new Map<string, string>();
    for (const confederation of DEFAULT_PROFILE.confederations) {
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

  it("o mundo padrão tem as cinco competições continentais principais e nenhuma secundária", () => {
    const bank = generateFootballWorld(DEFAULT_PROFILE, "padrao");
    const ids = bank.competitions.filter((c) => c.id.startsWith("continental-")).map((c) => c.id);
    expect(ids).toEqual(
      ["conmebol", "uefa", "concacaf", "caf", "afc"].map((id) => `continental-${id}-maior`),
    );
  });
});
