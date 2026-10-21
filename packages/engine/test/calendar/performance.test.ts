import { describe, expect, it } from "vitest";
import { buildSeasonCalendar, calendarCompetitions } from "../../src/calendar/season-calendar";
import { advanceCareerDays, advanceCareerToNextMatch } from "../../src/career/day";
import { MANAGER, newState } from "../career/day-helpers";
import { twoCompetitionsBank } from "../fixtures/two-competitions";

// 017 plano: montar o calendário < 5 ms; avançar até o próximo jogo < 300 ms no banco de teste.
// Limites com folga sobre o medido, para tolerar máquinas lentas e o CI (mediana de 5 execuções).
const RUNS = 5;
const MAX_BUILD_MS = 5;
const MAX_ADVANCE_MS = 300;

function median(work: () => unknown): number {
  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    const start = performance.now();
    work();
    times.push(performance.now() - start);
  }
  return times.sort((a, b) => a - b)[Math.floor(RUNS / 2)] ?? Number.POSITIVE_INFINITY;
}

describe("desempenho do calendário (017 R15)", () => {
  const world = twoCompetitionsBank();

  it(`monta o calendário das duas competições em menos de ${MAX_BUILD_MS} ms`, () => {
    const competitions = calendarCompetitions(world.competitions);
    const time = median(() => buildSeasonCalendar(competitions, "2027-01-01"));
    expect(time).toBeLessThan(MAX_BUILD_MS);
  });

  it(`avança até o próximo jogo do clube em menos de ${MAX_ADVANCE_MS} ms`, () => {
    // clube-040 não joga o torneio: o avanço simula a quarta inteira antes de parar.
    const state = newState(world, "desempenho");
    const start = advanceCareerDays(state, { days: 2 }, "desempenho", MANAGER);
    if (!start.ok) throw new Error(JSON.stringify(start.error));
    const time = median(() => advanceCareerToNextMatch(start.state, "desempenho", "clube-040"));
    expect(time).toBeLessThan(MAX_ADVANCE_MS);
  });
});
