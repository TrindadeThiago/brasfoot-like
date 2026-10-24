import { describe, expect, it } from "vitest";
import { completeCareerDay } from "../../src/career/day";
import {
  type CareerSeasonState,
  competitionSeason,
  currentDay,
  roundMatches,
} from "../../src/career/season-state";
import { cupEvents } from "../../src/knockout/events";
import { cupSeasonOf } from "../../src/knockout/history";
import type { CompletedBank } from "../../src/model/types";
import { cupView } from "../../src/stages/cup-view";
import { LOWER_LEVEL, regionalBank, STAGES_ID } from "../fixtures/stages-bank";
import { newState } from "./day-helpers";

// 019 (T031): prêmios e eventos do mata-mata de uma divisão em fases, pelos ganchos da copa (R12).
const SEED = "fases-copa";
const MANAGER = "clube-021";
const QUARTER = 10_000;
const SEMI = 20_000;
const FINAL = 40_000;
const PRIZES = [QUARTER, SEMI, FINAL];

/** Banco regional com prêmio por fase (quartas, semifinal e final). */
function prizedBank(): CompletedBank {
  const world = regionalBank();
  const lower = world.competitions
    .find((competition) => competition.id === STAGES_ID)
    ?.divisions.find((division) => division.level === LOWER_LEVEL);
  const knockout = lower?.stages?.[1];
  if (knockout?.type !== "knockout") throw new Error("sem mata-mata");
  knockout.phases.forEach((phase, index) => {
    phase.prize = PRIZES[index] ?? 0;
  });
  return world;
}

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

describe("prêmios e eventos do mata-mata da divisão em fases", () => {
  const world = prizedBank();

  /** Joga a temporada dia a dia e junta os eventos de copa de cada dia da divisão em fases. */
  function playAndCollect(options: { systems?: boolean } = {}) {
    let state = newState(world, SEED, options.systems ? { systems: true, manager: MANAGER } : {});
    const events: ReturnType<typeof cupEvents> = [];
    while (currentDay(state)) {
      const day = currentDay(state);
      state = ok(completeCareerDay(state, SEED, MANAGER));
      const slot = day?.slots.find((entry) => entry.competitionId === STAGES_ID);
      const league = competitionSeason(state, STAGES_ID);
      const lower = league.divisions.find((season) => season.divisionLevel === LOWER_LEVEL);
      const stage = lower?.stages?.[1];
      if (!slot || !lower || !stage?.started) continue;
      const matches = roundMatches(league, slot.round, day?.date ?? "").filter(
        (match) => match.divisionLevel === LOWER_LEVEL && match.fixture.stage?.kind === "knockout",
      );
      events.push(...cupEvents(state.world, cupView(lower, state.world, 1), matches));
    }
    return { state, events };
  }

  it("cada vencedor de confronto recebe o prêmio da fase, no caixa e com a competição", () => {
    const { state } = playAndCollect();
    const prizes = state.finances.ledger.filter(
      (entry) => entry.category === "prize" && entry.competitionId === STAGES_ID,
    );
    expect(prizes).toHaveLength(7);
    const total = prizes.reduce((sum, entry) => sum + entry.amount, 0);
    expect(total).toBe(4 * QUARTER + 2 * SEMI + FINAL);
    expect(prizes.filter((entry) => entry.amount === FINAL)).toHaveLength(1);
  }, 180_000);

  it("cada confronto decidido gera a eliminação de quem caiu, sem título de copa", () => {
    const { events } = playAndCollect();
    const out = events.filter((event) => event.kind === "out");
    expect(out).toHaveLength(7);
    expect(events.filter((event) => event.kind === "title")).toHaveLength(0);
    expect(out.map((event) => event.phase).sort()).toEqual([0, 0, 0, 0, 1, 1, 2]);
    expect(new Set(out.map((event) => event.clubId)).size).toBe(7);
  }, 180_000);

  it("não vira copa: nenhuma edição entra no histórico de copas", () => {
    const { state } = playAndCollect();
    expect(cupSeasonOf(competitionSeason(state, STAGES_ID))).toBeUndefined();
  }, 180_000);

  it("com torcida, diretoria e notícias ligadas a temporada inteira corre sem falhar", () => {
    const { state } = playAndCollect({ systems: true });
    expect(state.news?.feed.length).toBeGreaterThan(0);
    expect(state.fans).toBeDefined();
    expect(state.board).toBeDefined();
  }, 240_000);
});
