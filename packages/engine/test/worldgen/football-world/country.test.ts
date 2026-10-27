import { describe, expect, it } from "vitest";
import { GEO_COUNTRIES, geoCountry, TIERS } from "../../../src/worldgen/football-world";
import { buildCountry } from "../../../src/worldgen/football-world/country";

describe("um país por nível (024 R1, R4)", () => {
  it.each([
    ["inglaterra", 1],
    ["portugal", 2],
    ["grecia", 3],
    ["fiji", 4],
  ] as const)("%s (nível %i): divisões, clubes, copa, elencos e cidades reais", (geoId, tier) => {
    const geo = geoCountry(geoId);
    if (!geo) throw new Error("sem geografia");
    const built = buildCountry({
      spec: { geoId, tier, strength: 1 },
      geo,
      seed: "pais",
      referenceDate: "2027-01-01",
      abbreviations: new Set(),
      leagueStartWeek: 8,
    });
    const shape = TIERS[tier];
    const league = built.competitions[0];
    expect(league?.id).toBe(`liga-${geo.code.toLowerCase()}`);
    expect(league?.divisions).toHaveLength(shape.divisions);
    for (const division of league?.divisions ?? []) {
      expect(division.clubIds).toHaveLength(shape.clubsPerDivision);
    }
    expect(built.competitions[1]?.id).toBe(`copa-${geo.code.toLowerCase()}`);
    expect(built.clubs).toHaveLength(shape.divisions * shape.clubsPerDivision);
    for (const club of built.clubs) {
      expect(geo.cities).toContain(club.city);
      expect(club.id.startsWith(`clube-${geo.code.toLowerCase()}-`)).toBe(true);
    }
    // No máximo dois clubes por cidade.
    const perCity = new Map<string, number>();
    for (const club of built.clubs) perCity.set(club.city, (perCity.get(club.city) ?? 0) + 1);
    expect(Math.max(...perCity.values())).toBeLessThanOrEqual(2);
    for (const club of built.clubs) {
      const squad = built.players.filter((player) => player.clubId === club.id);
      expect(squad.length).toBeGreaterThanOrEqual(23);
      expect(squad.length).toBeLessThanOrEqual(28);
    }
    expect(built.country.names?.firstNames.length).toBeGreaterThanOrEqual(75);
  });

  it("países fortes têm clubes mais reputados e mais ricos que os fracos", () => {
    const geo = geoCountry("espanha");
    if (!geo) throw new Error("sem geografia");
    const make = (strength: number) =>
      buildCountry({
        spec: { geoId: "espanha", tier: 1, strength },
        geo,
        seed: "forca",
        referenceDate: "2027-01-01",
        abbreviations: new Set(),
        leagueStartWeek: 8,
      });
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    const strong = make(1.5);
    const weak = make(0.5);
    expect(mean(strong.clubs.map((c) => c.reputation))).toBeGreaterThan(
      mean(weak.clubs.map((c) => c.reputation)),
    );
    expect(mean(strong.clubs.map((c) => c.initialCash))).toBeGreaterThan(
      mean(weak.clubs.map((c) => c.initialCash)),
    );
    const wage = (built: ReturnType<typeof make>) =>
      built.competitions[0]?.economy?.wageFactorPct ?? 0;
    expect(wage(strong)).toBeGreaterThan(wage(weak));
  });

  it("a geografia cobre os países do perfil", () => {
    expect(GEO_COUNTRIES.length).toBeGreaterThanOrEqual(44);
  });
});
