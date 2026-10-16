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
    const start = performance.now();
    for (const input of inputs.slice(0, 10)) simulateMatch(input);
    expect(performance.now() - start).toBeLessThan(100);
  });

  it("2.000 partidas em menos de 12 s (equivale a 10.000 em menos de 60 s)", () => {
    const start = performance.now();
    for (const input of inputs) simulateMatch(input);
    expect(performance.now() - start).toBeLessThan(12000);
  }, 60000);
});
