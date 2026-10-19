import { describe, expect, it } from "vitest";
import { advanceLeague } from "../../src/career/league-round";
import { seasonTurnover } from "../../src/career/turnover";
import { newLeague, playedLeague, testWorld } from "./helpers";

// SC-005/SC-006: limites do motor, com folga para a interface (rodada < 1 s, virada < 2 s).
const ROUND_LIMIT_MS = 300;
const TURNOVER_LIMIT_MS = 500;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe("desempenho da liga (SC-005, SC-006)", () => {
  it(`uma rodada das duas divisões (20 partidas) em menos de ${ROUND_LIMIT_MS} ms`, () => {
    const league = newLeague("desempenho-rodada");
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      const result = advanceLeague(league, testWorld(), { rounds: 1 });
      expect(result.ok).toBe(true);
      return performance.now() - start;
    });
    expect(median(times)).toBeLessThan(ROUND_LIMIT_MS);
  });

  it(`a virada de temporada em menos de ${TURNOVER_LIMIT_MS} ms`, () => {
    const finished = playedLeague("desempenho-virada");
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      const result = seasonTurnover(finished, testWorld(), [], { careerSeed: "desempenho-virada" });
      expect(result.ok).toBe(true);
      return performance.now() - start;
    });
    expect(median(times)).toBeLessThan(TURNOVER_LIMIT_MS);
  }, 30000);
});
