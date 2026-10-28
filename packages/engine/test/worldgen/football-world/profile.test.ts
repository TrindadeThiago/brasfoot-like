import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  validateProfile,
  type WorldProfile,
} from "../../../src/worldgen/football-world";

const clone = (profile: WorldProfile): WorldProfile => structuredClone(profile);
const codes = (profile: WorldProfile) => validateProfile(profile).map((issue) => issue.code);

describe("perfil do mundo (024 R1)", () => {
  it("o perfil padrão é válido, com as cinco confederações e o Brasil primeiro", () => {
    expect(validateProfile(DEFAULT_PROFILE)).toEqual([]);
    expect(validateProfile(DEFAULT_PROFILE)).toEqual([]);
    expect(DEFAULT_PROFILE.confederations.map((c) => c.id)).toEqual([
      "conmebol",
      "uefa",
      "concacaf",
      "caf",
      "afc",
    ]);
    expect(DEFAULT_PROFILE.confederations.every((c) => c.countries.length === 3)).toBe(true);
  });

  it("país desconhecido ou repetido", () => {
    const unknown = clone(DEFAULT_PROFILE);
    unknown.confederations[0]?.countries.push({ geoId: "atlantida", tier: 3, strength: 1 });
    expect(codes(unknown)).toContain("profile.unknown_country");
    const repeated = clone(DEFAULT_PROFILE);
    repeated.confederations[0]?.countries.push({ geoId: "inglaterra", tier: 3, strength: 1 });
    expect(codes(repeated)).toContain("profile.duplicate_country");
  });

  it("confederação com menos de 3 países", () => {
    const profile = clone(DEFAULT_PROFILE);
    const ofc = profile.confederations.find((c) => c.id === "afc");
    if (ofc) ofc.countries = ofc.countries.slice(0, 2);
    expect(codes(profile)).toContain("profile.few_countries");
  });

  it("nível e força fora da faixa", () => {
    const profile = clone(DEFAULT_PROFILE);
    const first = profile.confederations[0]?.countries[0];
    if (first) {
      (first as { tier: number }).tier = 9;
      first.strength = 2;
    }
    expect(codes(profile)).toEqual(
      expect.arrayContaining(["profile.tier_range", "profile.strength_range"]),
    );
  });

  it("cidades insuficientes e idioma desconhecido", () => {
    const profile = clone(DEFAULT_PROFILE);
    const colombia = profile.confederations[0]?.countries.find((c) => c.geoId === "colombia");
    if (colombia) {
      colombia.clubsPerDivision = 60;
      colombia.language = "klingon";
    }
    expect(codes(profile)).toEqual(
      expect.arrayContaining(["profile.cities_short", "profile.unknown_language"]),
    );
  });

  it("o Brasil precisa dos clubes nacionais dentro da 1ª divisão dos estaduais", () => {
    const profile = clone(DEFAULT_PROFILE);
    if (profile.brazil) profile.brazil.states = 2;
    expect(codes(profile)).toContain("profile.brazil_range");
  });
});
