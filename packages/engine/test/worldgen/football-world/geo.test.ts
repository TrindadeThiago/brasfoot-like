import { describe, expect, it } from "vitest";
import { BRAZIL_STATES, GEO_COUNTRIES } from "../../../src/worldgen/football-world";

describe("dados de geografia reais (024 R2)", () => {
  it("países com id e código únicos, idioma e cidades distintas de até 20 caracteres", () => {
    expect(new Set(GEO_COUNTRIES.map((c) => c.id)).size).toBe(GEO_COUNTRIES.length);
    expect(new Set(GEO_COUNTRIES.map((c) => c.code)).size).toBe(GEO_COUNTRIES.length);
    for (const country of GEO_COUNTRIES) {
      expect(country.code).toMatch(/^[A-Z]{3}$/);
      expect(new Set(country.cities).size).toBe(country.cities.length);
      expect(country.cities.length).toBeGreaterThanOrEqual(8);
      for (const city of country.cities) expect(city.length).toBeLessThanOrEqual(20);
    }
  });

  it("os 27 estados do Brasil, com siglas únicas e ao menos 15 cidades reais cada", () => {
    expect(BRAZIL_STATES).toHaveLength(27);
    expect(new Set(BRAZIL_STATES.map((s) => s.abbreviation)).size).toBe(27);
    for (const state of BRAZIL_STATES) {
      expect(state.abbreviation).toMatch(/^[A-Z]{2}$/);
      expect(new Set(state.cities).size).toBe(state.cities.length);
      expect(state.cities.length).toBeGreaterThanOrEqual(15);
      for (const city of state.cities) expect(city.length).toBeLessThanOrEqual(20);
    }
  });

  it("o Brasil e os países do perfil padrão existem na geografia", () => {
    const ids = new Set(GEO_COUNTRIES.map((c) => c.id));
    for (const id of ["brasil", "argentina", "inglaterra", "egito", "japao", "nova-zelandia"]) {
      expect(ids.has(id)).toBe(true);
    }
  });
});
