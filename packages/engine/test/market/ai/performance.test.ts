import { describe, expect, it } from "vitest";
import { aiMarketRound } from "../../../src/market/ai/round";
import { marketContext } from "../helpers";

// Limite de desempenho da 011 (plan.md; medido ~50 ms no mundo inteiro com a janela aberta).
const ROUND_LIMIT_MS = 150;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe("desempenho da IA de mercado", () => {
  it(`uma rodada da IA (40 clubes) em menos de ${ROUND_LIMIT_MS} ms`, () => {
    const context = marketContext();
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      aiMarketRound(context);
      return performance.now() - start;
    });
    expect(median(times)).toBeLessThan(ROUND_LIMIT_MS);
  });
});
