import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/engine.js";
import { clubIds, makeInput } from "./helpers/teams.js";

describe("desempenho (SC-006)", () => {
  const clubs = clubIds();
  const inputs = Array.from({ length: 2000 }, (_, index) =>
    makeInput(clubs[(2 * index) % 40] as string, clubs[(2 * index + 1) % 40] as string, {
      seed: index,
    }),
  );

  it("uma rodada de 10 partidas em menos de 100 ms", () => {
    // Aquece o JIT e mede a melhor de 3 rodadas: a suíte roda em paralelo com as simulações
    // longas, e uma medição única a frio oscila perto do limite.
    for (const input of inputs.slice(10, 20)) simulateMatch(input);
    const rounds = [0, 1, 2].map((round) => {
      const start = performance.now();
      for (const input of inputs.slice(round * 10, round * 10 + 10)) simulateMatch(input);
      return performance.now() - start;
    });
    expect(Math.min(...rounds)).toBeLessThan(100);
  });

  it("2.000 partidas em menos de 12 s (equivale a 10.000 em menos de 60 s)", () => {
    const start = performance.now();
    for (const input of inputs) simulateMatch(input);
    expect(performance.now() - start).toBeLessThan(12000);
  }, 60000);
});
