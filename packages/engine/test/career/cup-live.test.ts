import { describe, expect, it } from "vitest";
import { completeCareerDay, startCareerDay } from "../../src/career/day";
import {
  type CareerSeasonState,
  competitionSeason,
  currentDay,
} from "../../src/career/season-state";
import { advanceRound, isRoundFinished, matchTicks } from "../../src/season/live-round";
import { CUP_ID, cupBank } from "../fixtures/cup-bank";
import { MANAGER, newState } from "./day-helpers";

function ok(result: { ok: boolean }): CareerSeasonState {
  const typed = result as { ok: true; state: CareerSeasonState } | { ok: false };
  if (!typed.ok) throw new Error(JSON.stringify(result));
  return typed.state;
}

/** Primeiro dia em que a copa joga: avança dia a dia até lá. */
function toCupDay(seed: string): CareerSeasonState {
  let state = newState(cupBank(), seed);
  for (;;) {
    const day = currentDay(state);
    if (!day) throw new Error("sem dia de copa");
    if (day.slots.some((slot) => slot.competitionId === CUP_ID)) return state;
    state = ok(completeCareerDay(state, seed, MANAGER));
  }
}

describe("copa ao vivo = copa direta (018 US2)", () => {
  it("um jogo que vai aos pênaltis, jogado passo a passo, dá o mesmo resultado do direto", () => {
    let checked = 0;
    for (let n = 0; n < 80 && checked < 1; n++) {
      const seed = `copa-live-${n}`;
      const state = toCupDay(seed);
      const slot = currentDay(state)?.slots.find((entry) => entry.competitionId === CUP_ID);
      const cup = competitionSeason(state, CUP_ID).divisions[0];
      const fixture = cup?.calendar[(slot?.round ?? 1) - 1]?.fixtures[0];
      if (!fixture) continue;
      const manager = fixture.home;
      const direct = ok(completeCareerDay(state, seed, manager));
      const directCup = competitionSeason(direct, CUP_ID).divisions[0];
      const record = directCup?.records.find((entry) => entry.home === fixture.home);
      if (record?.decision?.by !== "penalties") continue;

      const started = startCareerDay(state, manager);
      if (!started.ok || !started.live) throw new Error("sem rodada ao vivo");
      let live = started.live;
      let ticks = 0;
      while (!isRoundFinished(live)) {
        live = advanceRound(live, 1);
        ticks += 1;
      }
      const mine = live.matches.find((match) => match.fixture.home === fixture.home);
      expect(mine && matchTicks(mine.state)).toBeGreaterThan(98);
      expect(ticks).toBeGreaterThan(98);
      const via = ok(completeCareerDay(state, seed, manager, live));
      const viaCup = competitionSeason(via, CUP_ID).divisions[0];
      expect(viaCup?.records).toEqual(directCup?.records);
      checked += 1;
    }
    expect(checked).toBe(1);
  }, 120_000);
});
