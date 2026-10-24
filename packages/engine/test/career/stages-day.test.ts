import { describe, expect, it } from "vitest";
import { advanceCareerDays, completeCareerDay } from "../../src/career/day";
import {
  type CareerSeasonState,
  competitionSeason,
  currentDay,
  isCalendarOver,
} from "../../src/career/season-state";
import { tieState } from "../../src/knockout/tie";
import { isSeasonOver } from "../../src/season/season";
import { cupView } from "../../src/stages/cup-view";
import { LOWER_LEVEL, regionalBank, STAGES_ID } from "../fixtures/stages-bank";
import { newState } from "./day-helpers";

// 019 (T030): a divisão em fases no dia de jogos da carreira (US1).
const SEED = "fases-dia";
/** Clube da divisão de baixo (a em fases) comandado pelo jogador. */
const MANAGER = "clube-021";
const world = regionalBank();

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

const lowerOf = (state: CareerSeasonState) =>
  competitionSeason(state, STAGES_ID).divisions.find(
    (season) => season.divisionLevel === LOWER_LEVEL,
  );

describe("a divisão em fases no dia de jogos", () => {
  it("nunca chega a uma rodada sem jogos e termina com o calendário", () => {
    let state = newState(world, SEED);
    let days = 0;
    while (currentDay(state)) {
      const lower = lowerOf(state);
      if (lower && !isSeasonOver(lower)) {
        const day = currentDay(state);
        const slot = day?.slots.find((entry) => entry.competitionId === STAGES_ID);
        if (slot && slot.round === lower.nextRound) {
          expect(lower.calendar[slot.round - 1]?.fixtures.length).toBeGreaterThan(0);
        }
      }
      state = ok(completeCareerDay(state, SEED, MANAGER));
      days++;
    }
    expect(isCalendarOver(state)).toBe(true);
    expect(days).toBe(14);
    expect(isSeasonOver(lowerOf(state) as never)).toBe(true);
  }, 120_000);

  it("o mata-mata aparece logo depois da última rodada de grupos", () => {
    let state = newState(world, SEED);
    for (let day = 0; day < 4; day++) state = ok(completeCareerDay(state, SEED, MANAGER));
    expect(lowerOf(state)?.stages?.[1]?.started).toBe(false);
    state = ok(completeCareerDay(state, SEED, MANAGER));
    const lower = lowerOf(state);
    expect(lower?.stages?.[1]?.started).toBe(true);
    expect(lower?.stages?.[1]?.clubIds).toHaveLength(8);
    expect(lower?.calendar[5]?.fixtures).toHaveLength(4);
  }, 60_000);

  it("os jogos têm fase e grupo, e o clube eliminado nos grupos não joga o mata-mata", () => {
    const end = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER));
    const lower = lowerOf(end);
    if (!lower) throw new Error("sem divisão em fases");
    for (const round of lower.calendar) {
      for (const fixture of round.fixtures) {
        expect(fixture.stage).toBeDefined();
        if (fixture.stage?.kind === "groups") expect(fixture.stage.group).toMatch(/^[A-D]$/);
      }
    }
    const qualified = new Set(lower.stages?.[1]?.clubIds);
    for (const round of lower.calendar.slice(5)) {
      for (const fixture of round.fixtures) {
        expect(qualified.has(fixture.home)).toBe(true);
        expect(qualified.has(fixture.away)).toBe(true);
      }
    }
    const view = cupView(lower, end.world, 1);
    const final = view.bracket?.phases[2]?.ties[0];
    expect(final && tieState(view, 2, final.id).decided).toBe(true);
  }, 120_000);

  it("a bilheteria de todos os jogos, de grupo e de mata-mata, entra no caixa", () => {
    const end = ok(advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER));
    const played = competitionSeason(end, STAGES_ID).divisions.reduce(
      (sum, season) => sum + season.records.length,
      0,
    );
    expect(played).toBe(14 * 4 + 5 * 8 + 4 + 2 + 1);
    expect(end.finances.gates.length).toBe(played);
  }, 120_000);

  it("salvar e carregar no meio dos grupos não muda o resto da temporada", () => {
    let state = newState(world, SEED);
    for (let day = 0; day < 3; day++) state = ok(completeCareerDay(state, SEED, MANAGER));
    const loaded = JSON.parse(JSON.stringify(state)) as CareerSeasonState;
    const a = ok(advanceCareerDays(state, { toEnd: true }, SEED, MANAGER));
    const b = ok(advanceCareerDays(loaded, { toEnd: true }, SEED, MANAGER));
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  }, 180_000);
});
