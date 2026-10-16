import { describe, expect, it } from "vitest";
import type { MatchChange } from "../../src/match/types";
import {
  advanceRound,
  applyRoundChange,
  completeRound,
  finishRound,
  formationChange,
  type LiveRound,
  matchOf,
  startRound,
} from "../../src/season/live-round";
import type { Season } from "../../src/season/types";
import { newSeason, testWorld } from "./helpers/world";

function started(season: Season): LiveRound {
  const result = startRound(season, testWorld());
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.round;
}

function apply(round: LiveRound, clubId: string, change: MatchChange): LiveRound {
  const result = applyRoundChange(round, clubId, change);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.round;
}

function team(round: LiveRound, clubId: string) {
  const found = matchOf(round, clubId);
  if (!found) throw new Error("sem partida");
  return found.match.state.teams[found.side];
}

/** Primeiro titular em campo que não é goleiro e o primeiro reserva. */
function swap(round: LiveRound, clubId: string): MatchChange {
  const current = team(round, clubId);
  const out = Object.entries(current.onField).find(([slot, id]) => slot !== "gk" && id)?.[1];
  return { type: "substitution", out: out as string, in: current.bench[0] as string };
}

describe("decisões durante a rodada (R2, SC-002, SC-003)", () => {
  const season = newSeason("decisoes");
  const clubId = season.calendar[0]?.fixtures[0]?.away as string;

  function liveWithDecisions(): LiveRound {
    let round = advanceRound(started(season), 30);
    round = apply(round, clubId, { type: "posture", posture: "attacking" });
    round = advanceRound(round, 30);
    round = apply(round, clubId, swap(round, clubId));
    round = apply(round, clubId, swap(round, clubId));
    round = apply(round, clubId, formationChange(round, clubId, "4-3-3", testWorld()));
    return finishRound(advanceRound(round, 3));
  }

  it("registra as decisões com o passo em que foram feitas", () => {
    const round = liveWithDecisions();
    expect(round.decisions.map((decision) => [decision.tick, decision.change.type])).toEqual([
      [30, "posture"],
      [60, "substitution"],
      [60, "substitution"],
      [60, "formation"],
    ]);
    const current = team(round, clubId);
    expect(current.substitutionsUsed).toBeGreaterThanOrEqual(2);
    expect(current.formation).toBe("4-3-3");
  });

  it("reaplicar o log com outro ritmo dá o mesmo resultado", () => {
    const live = liveWithDecisions();
    let replay = started(season);
    for (const decision of live.decisions) {
      while (replay.tick < decision.tick) replay = advanceRound(replay, 1);
      replay = apply(replay, decision.clubId, decision.change);
    }
    replay = finishRound(replay);
    const a = completeRound(season, testWorld(), live);
    const b = completeRound(season, testWorld(), replay);
    expect(a).toEqual(b);
  });

  it("respeita o limite de substituições e quem saiu não volta", () => {
    let round = advanceRound(started(season), 50);
    const first = swap(round, clubId) as Extract<MatchChange, { type: "substitution" }>;
    round = apply(round, clubId, first);
    const back = applyRoundChange(round, clubId, {
      type: "substitution",
      out: first.in,
      in: first.out,
    });
    expect(back.ok).toBe(false);
    if (!back.ok) expect(back.error.code).toBe("change.player_not_on_bench");
    while (team(round, clubId).substitutionsUsed < 5)
      round = apply(round, clubId, swap(round, clubId));
    const extra = applyRoundChange(round, clubId, swap(round, clubId));
    expect(extra.ok).toBe(false);
    if (!extra.ok) expect(extra.error.code).toBe("change.limit_reached");
  });

  it("partida terminada e clube que não joga recusam decisões", () => {
    const done = finishRound(started(season));
    const finished = applyRoundChange(done, clubId, { type: "posture", posture: "defensive" });
    expect(finished.ok).toBe(false);
    if (!finished.ok) expect(finished.error.code).toBe("change.match_finished");
    const outsider = applyRoundChange(started(season), "clube-inexistente", {
      type: "posture",
      posture: "defensive",
    });
    expect(outsider.ok).toBe(false);
  });
});
