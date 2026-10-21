import { describe, expect, it } from "vitest";
import { advanceCareer } from "../../src/career/day";
import { advanceLeague } from "../../src/career/league-round";
import { applyRoundFinances } from "../../src/finance/round";
import { career, testWorld } from "./helpers";

// Limites de desempenho da 008 (plan.md, Performance Goals).
const FINANCE_ROUND_LIMIT_MS = 5;
const CAREER_ROUND_LIMIT_MS = 300;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe("desempenho das finanças", () => {
  const start = career("desempenho-financas");
  const played = advanceLeague(start.league, testWorld(), { rounds: 1 });
  if (!played.ok) throw new Error("falhou");

  it(`finanças de uma rodada (40 clubes) em menos de ${FINANCE_ROUND_LIMIT_MS} ms`, () => {
    const times = Array.from({ length: 21 }, () => {
      const begin = performance.now();
      applyRoundFinances(start.finances, played.league, testWorld(), 1, "clube-001");
      return performance.now() - begin;
    });
    expect(median(times)).toBeLessThan(FINANCE_ROUND_LIMIT_MS);
  });

  it(`uma rodada da liga com finanças em menos de ${CAREER_ROUND_LIMIT_MS} ms`, () => {
    const times = Array.from({ length: 5 }, () => {
      const begin = performance.now();
      const result = advanceCareer(
        start.league,
        start.finances,
        testWorld(),
        { rounds: 1 },
        "clube-001",
      );
      expect(result.ok).toBe(true);
      return performance.now() - begin;
    });
    expect(median(times)).toBeLessThan(CAREER_ROUND_LIMIT_MS);
  });
});
