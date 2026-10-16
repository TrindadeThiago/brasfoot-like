import { describe, expect, it } from "vitest";
import { applyChange } from "../../src/match/changes.js";
import { advanceMatch, simulateMatch, startMatch } from "../../src/match/engine.js";
import { matchResult } from "../../src/match/result.js";
import type { MatchState } from "../../src/match/types.js";
import { clubIds, makeInput } from "./helpers/teams.js";

const [HOME, AWAY] = clubIds() as [string, string];

function start(seed: number): MatchState {
  const result = startMatch(makeInput(HOME, AWAY, { seed }));
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}

function direct(seed: number) {
  const outcome = simulateMatch(makeInput(HOME, AWAY, { seed }));
  if (!outcome.ok) throw new Error("entrada inválida");
  return outcome.result;
}

function stepwise(seed: number, size: number) {
  let state = start(seed);
  while (state.status !== "finished" && state.status !== "abandoned") {
    state = advanceMatch(state, { minutes: size });
  }
  return matchResult(state);
}

describe("passos = simular direto (FR-022, SC-001)", () => {
  it.each(Array.from({ length: 30 }, (_, index) => index + 1))("seed %i", (seed) => {
    const expected = direct(seed);
    expect(stepwise(seed, 1)).toEqual(expected);
    expect(stepwise(seed, 7)).toEqual(expected);
  });

  it("estado serializado continua igual (FR-026)", () => {
    const midway = advanceMatch(start(11), { minutes: 37 });
    const restored: MatchState = JSON.parse(JSON.stringify(midway));
    expect(matchResult(advanceMatch(restored, { toEnd: true }))).toEqual(
      matchResult(advanceMatch(midway, { toEnd: true })),
    );
  });

  it("mesmas mudanças nos mesmos minutos ⇒ mesmo resultado", () => {
    const play = () => {
      let state = advanceMatch(start(21), { minutes: 30 });
      const changed = applyChange(state, "home", { type: "posture", posture: "attacking" });
      if (!changed.ok) throw new Error(changed.error.code);
      state = advanceMatch(changed.state, { minutes: 25 });
      const team = state.teams.away;
      const out = Object.values(team.onField).find((id) => id !== null && id !== team.onField.gk);
      const sub = applyChange(state, "away", {
        type: "substitution",
        out: out as string,
        in: team.bench[0] as string,
      });
      if (!sub.ok) throw new Error(sub.error.code);
      return matchResult(advanceMatch(sub.state, { toEnd: true }));
    };
    expect(play()).toEqual(play());
  });
});
