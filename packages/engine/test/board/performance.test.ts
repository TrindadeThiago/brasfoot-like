import { describe, expect, it } from "vitest";
import { boardAfterRound } from "../../src/board/round";
import { newCareer, play } from "./helpers";

// Limite de desempenho da 012 (plan.md, Performance Goals).
const AFTER_ROUND_LIMIT_MS = 10;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe("desempenho da diretoria", () => {
  it(`diretoria de uma rodada (todos os clubes) em menos de ${AFTER_ROUND_LIMIT_MS} ms`, () => {
    const career = play(newCareer(), { rounds: 10 });
    const elapsed = median(
      Array.from({ length: 11 }, () => {
        const start = performance.now();
        boardAfterRound(career, 10);
        return performance.now() - start;
      }),
    );
    expect(elapsed).toBeLessThan(AFTER_ROUND_LIMIT_MS);
  });
});
