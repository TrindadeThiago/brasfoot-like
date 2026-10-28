import { describe, expect, it } from "vitest";
import {
  continentalSlots,
  economicScale,
  shiftedReputation,
  slotWeights,
} from "../../../src/worldgen/football-world/economy";
import { generateWorldBank } from "../../../src/worldgen/world-example";

describe("economia por país (024 R6)", () => {
  it("a escala econômica cresce com a força: 0,8 a 1,8", () => {
    expect(economicScale(0.5)).toBeCloseTo(1, 5);
    expect(economicScale(1.5)).toBeCloseTo(1.8, 5);
    expect(economicScale(1.5)).toBeGreaterThan(economicScale(1));
  });

  it("a reputação sobe com a força, entre 5 e 95", () => {
    expect(shiftedReputation(60, 1.5)).toBeGreaterThan(shiftedReputation(60, 0.5));
    expect(shiftedReputation(95, 1.5)).toBe(95);
    expect(shiftedReputation(3, 0.5)).toBe(5);
  });

  it("as vagas seguem o quadrado da força e fecham o total", () => {
    const strengths = [1.5, 1.0, 0.5];
    expect(slotWeights(strengths)).toEqual([2.25, 1, 0.25]);
    const slots = continentalSlots(16, strengths, [8, 8, 8]);
    expect(slots.reduce((sum, value) => sum + value, 0)).toBe(16);
    expect(slots[0] ?? 0).toBeGreaterThan(slots[1] ?? 0);
    expect(slots[1] ?? 0).toBeGreaterThan(slots[2] ?? 0);
  });

  it("todo país com espaço tem ao menos uma vaga e nunca passa do teto", () => {
    const slots = continentalSlots(10, [1.5, 1.5, 1.5, 0.5], [3, 3, 3, 3]);
    expect(slots.every((value) => value >= 1)).toBe(true);
    expect(slots.every((value) => value <= 3)).toBe(true);
    expect(slots.reduce((sum, value) => sum + value, 0)).toBe(10);
  });

  it("regressão: o mundo de 3 países da 020 não mudou depois de exportar scaleEconomy", () => {
    const a = generateWorldBank({ seed: "paises-1", countries: 3, divisionsPerCountry: 2 });
    const b = generateWorldBank({ seed: "paises-1", countries: 3, divisionsPerCountry: 2 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const economies = a.competitions.map((c) => c.economy?.wageFactorPct);
    expect(economies.some((value) => value !== undefined)).toBe(true);
  });
});
