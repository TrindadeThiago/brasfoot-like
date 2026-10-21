import { describe, expect, it } from "vitest";
import { completeCareerDay } from "../../src/career/day";
import { type CareerSeasonState, currentDay } from "../../src/career/season-state";
import { CUP_ID, cupBank } from "../fixtures/cup-bank";
import { cupHistoryEntryOf } from "../knockout/helpers";
import { MANAGER, newState } from "./day-helpers";

const SEED = "copa-sistemas";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

/** Joga dia a dia até o fim e junta os motivos de torcida/diretoria e os tipos de manchete. */
function observe(seed: string) {
  let state = newState(cupBank(), seed, { systems: true });
  const fans = new Set<string>();
  const board = new Set<string>();
  const news = new Set<string>();
  while (currentDay(state)) {
    state = ok(completeCareerDay(state, seed, MANAGER));
    for (const change of state.fans?.clubs[MANAGER]?.recent ?? []) {
      for (const factor of change.factors) fans.add(factor.kind);
    }
    for (const change of state.board?.clubs[MANAGER]?.recent ?? []) {
      for (const factor of change.factors) board.add(factor.kind);
    }
    for (const feed of state.news?.feed ?? []) {
      for (const headline of feed.headlines) news.add(headline.type);
    }
  }
  return { state, fans, board, news };
}

describe("copa na torcida, na diretoria e nas manchetes (018 US5)", () => {
  const runs = [observe(`${SEED}-a`), observe(`${SEED}-b`), observe(`${SEED}-c`)];

  it("eliminação ou título aparece na torcida e na diretoria do técnico", () => {
    for (const run of runs) {
      expect(run.fans.has("cupOut") || run.fans.has("cupTitle")).toBe(true);
      expect(run.board.has("cupOut") || run.board.has("cupTitle")).toBe(true);
      expect(run.board.has("cupGoal")).toBe(true);
    }
  });

  it("a diretoria não demite por conta da copa: a confiança segue em [0, 100]", () => {
    for (const run of runs) {
      const confidence = run.state.board?.clubs[MANAGER]?.confidence ?? -1;
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(100);
    }
  });

  it("as manchetes de copa existem (campeão, eliminação, final ou zebra)", () => {
    const cupTypes = ["cupChampion", "cupElimination", "cupFinal", "cupUpset"];
    for (const run of runs) expect(cupTypes.some((type) => run.news.has(type))).toBe(true);
    expect(runs.some((run) => run.news.has("cupChampion"))).toBe(true);
  });

  it("o histórico da copa tem campeão, vice, final e fase de cada clube", () => {
    for (const run of runs) {
      const entry = cupHistoryEntryOf(run.state, CUP_ID);
      expect(entry?.championId).not.toBe(entry?.runnerUpId);
      expect(Object.keys(entry?.reached ?? {})).toHaveLength(16);
      expect(entry?.reached[entry?.championId ?? ""]).toBe(4);
      expect(entry?.final.decidedBy).toBeDefined();
    }
  });
});
