import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { type DrawClub, drawPhase } from "../../src/knockout/draw";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { MANAGER, newState } from "../career/day-helpers";

// 018 plano: sortear 32 clubes < 1 ms; um dia de copa no banco padrão < 300 ms. Limites com folga
// sobre o medido (mediana de 5 execuções).
const RUNS = 5;
const MAX_DRAW_MS = 1;
const MAX_CUP_DAY_MS = 300;

function median(work: () => unknown): number {
  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const start = performance.now();
    work();
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b)[Math.floor(RUNS / 2)] ?? Number.POSITIVE_INFINITY;
}

describe("desempenho da copa (018)", () => {
  it(`sorteia 32 clubes em menos de ${MAX_DRAW_MS} ms`, () => {
    const clubs: DrawClub[] = Array.from({ length: 32 }, (_, index) => ({
      id: `c${index}`,
      reputation: 100 - index,
      division: (index % 2) + 1,
    }));
    const rules = { home: "division", seeded: true, legs: 1, neutral: false } as const;
    expect(median(() => drawPhase(clubs, rules, "desempenho"))).toBeLessThan(MAX_DRAW_MS);
  });

  it(`fecha o primeiro dia de copa do banco padrão em menos de ${MAX_CUP_DAY_MS} ms`, () => {
    const world = completeHiddenAttributes(
      generateDefaultBank({ seed: "brasfoot-like-default-1", cup: true }),
      "desempenho",
    );
    const state = newState(world, "desempenho");
    // Domingo e depois a quarta da primeira fase da copa.
    const before = advanceCareerDays(state, { days: 1 }, "desempenho", MANAGER);
    if (!before.ok) throw new Error(JSON.stringify(before.error));
    const time = median(() => advanceCareerDays(before.state, { days: 1 }, "desempenho", MANAGER));
    expect(time).toBeLessThan(MAX_CUP_DAY_MS);
  });
});
