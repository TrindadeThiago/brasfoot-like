import { describe, expect, it } from "vitest";
import { intIrwinHall, intTriangular, irwinHall, triangular } from "../../src/rng/distributions";
import { createRng } from "../../src/rng/xoshiro";

const N = 20000;

describe("irwinHall", () => {
  it("fica em [0, 1) com média próxima de 0,5", () => {
    const rng = createRng("ih");
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const value = irwinHall(rng, 4);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      sum += value;
    }
    expect(sum / N).toBeCloseTo(0.5, 1);
  });
});

describe("triangular", () => {
  it("respeita os limites e concentra valores perto da moda", () => {
    const rng = createRng("tri");
    let nearMode = 0;
    let nearEdge = 0;
    for (let i = 0; i < N; i++) {
      const value = triangular(rng, 17, 25, 37);
      expect(value).toBeGreaterThanOrEqual(17);
      expect(value).toBeLessThanOrEqual(37);
      if (value >= 24 && value < 26) nearMode++;
      if (value >= 35) nearEdge++;
    }
    expect(nearMode).toBeGreaterThan(nearEdge);
  });
});

describe("inteiros", () => {
  it("intIrwinHall nunca sai da faixa e cobre os extremos", () => {
    const rng = createRng("iih");
    const seen = new Set<number>();
    for (let i = 0; i < N; i++) {
      const value = intIrwinHall(rng, 1, 5, 2);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(5);
      seen.add(value);
    }
    expect(seen.size).toBe(5);
  });

  it("intTriangular nunca sai da faixa", () => {
    const rng = createRng("it");
    for (let i = 0; i < N; i++) {
      const value = intTriangular(rng, 16, 25, 37);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(16);
      expect(value).toBeLessThanOrEqual(37);
    }
  });
});
