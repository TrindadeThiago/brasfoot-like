import { describe, expect, it } from "vitest";
import { REGIONAL_DEFAULT_WEIGHT, regionalWeightFor } from "../../src/regional/weight";

const club = (reputation: number) => ({ reputation });
const competition = (weight?: {
  pct?: number;
  byReputation?: { from: number; pct: number }[];
}) => ({
  regional: { region: "Norte", ...(weight ? { weight } : {}) },
});

describe("peso do estadual (023 R7, FR-013)", () => {
  it("sem peso declarado vale o padrão 100", () => {
    expect(REGIONAL_DEFAULT_WEIGHT).toBe(100);
    expect(regionalWeightFor(club(50), competition())).toBe(100);
  });

  it("o peso base vale para todos os clubes sem faixas", () => {
    expect(regionalWeightFor(club(10), competition({ pct: 70 }))).toBe(70);
    expect(regionalWeightFor(club(95), competition({ pct: 70 }))).toBe(70);
  });

  it("a faixa de reputação troca o peso: clube grande valoriza menos", () => {
    const weight = {
      pct: 100,
      byReputation: [
        { from: 60, pct: 40 },
        { from: 85, pct: 10 },
      ],
    };
    expect(regionalWeightFor(club(30), competition(weight))).toBe(100);
    expect(regionalWeightFor(club(60), competition(weight))).toBe(40);
    expect(regionalWeightFor(club(84), competition(weight))).toBe(40);
    expect(regionalWeightFor(club(85), competition(weight))).toBe(10);
  });

  it("peso 0 é válido e vira 0", () => {
    expect(regionalWeightFor(club(80), competition({ byReputation: [{ from: 70, pct: 0 }] }))).toBe(
      0,
    );
  });

  it("competição que não é regional tem peso padrão", () => {
    expect(regionalWeightFor(club(50), {})).toBe(100);
  });
});
