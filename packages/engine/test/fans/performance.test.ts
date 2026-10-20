import { describe, expect, it } from "vitest";
import { fansAfterRound } from "../../src/fans/mood";
import { fansCareer, MANAGER, playFans } from "./helpers";

// Limite de desempenho da 013 (plan.md, Performance Goals).
const AFTER_ROUND_LIMIT_MS = 5;

describe("desempenho da torcida", () => {
  it(`torcida de uma rodada (todos os clubes) em menos de ${AFTER_ROUND_LIMIT_MS} ms`, () => {
    const career = playFans(fansCareer(), { rounds: 10 });
    const times = Array.from({ length: 11 }, () => {
      const start = performance.now();
      fansAfterRound(career, 10, MANAGER);
      return performance.now() - start;
    }).sort((a, b) => a - b);
    expect(times[5]).toBeLessThan(AFTER_ROUND_LIMIT_MS);
  });
});
