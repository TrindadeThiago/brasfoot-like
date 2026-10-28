import { describe, expect, it } from "vitest";
import {
  COMPACT_PROFILE,
  generateFootballWorld,
  ProfileError,
  type WorldProfile,
} from "../../../src/worldgen/football-world";

describe("ajustar a estrutura pelo perfil (024 FR-013)", () => {
  it("outro número de clubes por divisão num país muda a pirâmide dele e continua válido", () => {
    const profile = structuredClone(COMPACT_PROFILE) as WorldProfile;
    const spec = profile.confederations[0]?.countries[0];
    if (spec) {
      spec.divisions = 2;
      spec.clubsPerDivision = 10;
    }
    const bank = generateFootballWorld(profile, "ajuste");
    const league = bank.competitions.find((c) => c.id === "liga-eng");
    expect(league?.divisions.map((d) => d.clubIds.length)).toEqual([10, 10]);
  });

  it("perfil com país inexistente diz o que não fecha", () => {
    const profile = structuredClone(COMPACT_PROFILE) as WorldProfile;
    profile.confederations[0]?.countries.push({ geoId: "atlantida", tier: 3, strength: 1 });
    expect(() => generateFootballWorld(profile, "x")).toThrow(ProfileError);
    try {
      generateFootballWorld(profile, "x");
    } catch (error) {
      expect((error as ProfileError).issues.map((i) => i.code)).toContain(
        "profile.unknown_country",
      );
    }
  });

  it("trocar a lista de países de uma confederação muda o mundo", () => {
    const profile = structuredClone(COMPACT_PROFILE) as WorldProfile;
    const ofc = profile.confederations.find((c) => c.id === "ofc");
    if (ofc) ofc.countries = ofc.countries.slice().reverse();
    const bank = generateFootballWorld(profile, "ordem");
    expect(bank.countries.map((c) => c.id)).not.toEqual(
      generateFootballWorld(COMPACT_PROFILE, "ordem").countries.map((c) => c.id),
    );
  });
});
