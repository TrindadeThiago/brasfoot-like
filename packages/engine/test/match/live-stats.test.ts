import { describe, expect, it } from "vitest";
import { advanceMatch, startMatch } from "../../src/match/engine";
import { liveStats, matchResult } from "../../src/match/result";
import { clubIds, makeInput } from "./helpers/teams";

const [HOME, AWAY] = clubIds() as [string, string];

describe("estatísticas ao vivo", () => {
  it("começam zeradas, com posse 50/50", () => {
    const started = startMatch(makeInput(HOME, AWAY, { seed: 11 }));
    if (!started.ok) throw new Error("entrada inválida");
    const stats = liveStats(started.state);
    expect(stats.home).toMatchObject({ shots: 0, yellowCards: 0, redCards: 0, possession: 50 });
    expect(stats.away.possession).toBe(50);
  });

  it("no fim são exatamente as do resultado, e só crescem durante o jogo", () => {
    const started = startMatch(makeInput(HOME, AWAY, { seed: 12 }));
    if (!started.ok) throw new Error("entrada inválida");
    let state = started.state;
    let previous = 0;
    while (state.status !== "finished" && state.status !== "abandoned") {
      state = advanceMatch(state, { minutes: 10 });
      const shots = liveStats(state).home.shots + liveStats(state).away.shots;
      expect(shots).toBeGreaterThanOrEqual(previous);
      previous = shots;
    }
    expect(liveStats(state)).toEqual(matchResult(state).stats);
  });
});
