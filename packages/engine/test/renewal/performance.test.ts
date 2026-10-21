import { describe, expect, it } from "vitest";
import { advanceCareer } from "../../src/career/day";
import { seasonTurnover } from "../../src/career/turnover";
import { createFinances } from "../../src/finance/create";
import { evolvePlayers } from "../../src/renewal/evolution";
import { initialRenewal } from "../../src/renewal/measure";
import { newLeague, testWorld } from "../career/helpers";

// Limites de desempenho da 009 (plan.md, Performance Goals).
const EVOLUTION_LIMIT_MS = 50;
const TURNOVER_LIMIT_MS = 500;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe("desempenho da renovação", () => {
  const league = newLeague("desempenho-renovacao");

  it(`uma evolução de ~1.000 jogadores em menos de ${EVOLUTION_LIMIT_MS} ms`, () => {
    const times = Array.from({ length: 11 }, () => {
      const start = performance.now();
      evolvePlayers(testWorld(), league, "s", "mid", 1, 19);
      return performance.now() - start;
    });
    expect(median(times)).toBeLessThan(EVOLUTION_LIMIT_MS);
  });

  it(`a virada com finanças e renovação em menos de ${TURNOVER_LIMIT_MS} ms`, () => {
    const renewal = { state: initialRenewal(testWorld()), careerSeed: "s" };
    const played = advanceCareer(
      league,
      createFinances(testWorld(), league),
      testWorld(),
      { toEnd: true },
      "",
      undefined,
      renewal,
    );
    if (!played.ok) throw new Error("falhou");
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      const result = seasonTurnover(played.league, played.world, [], {
        careerSeed: "s",
        finances: played.finances,
        managerClubId: "clube-001",
        renewal: played.renewal ?? renewal.state,
      });
      expect(result.ok).toBe(true);
      return performance.now() - start;
    });
    expect(median(times)).toBeLessThan(TURNOVER_LIMIT_MS);
  }, 60000);
});
