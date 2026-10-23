import { describe, expect, it } from "vitest";
import { advanceMatch, buildContext, simulateMatch, startMatch } from "../../src/match/engine";
import { fatiguedStrength, matchDrain, strengthOf } from "../../src/match/minute";
import type { MatchFatigue, MatchInput, MatchState } from "../../src/match/types";
import { clubIds, makeInput } from "./helpers/teams";

const [home, away] = clubIds() as [string, string];
const FATIGUE: MatchFatigue = { drainPer90: 30, penaltyBpPerPoint: 40 };

function started(input: MatchInput): MatchState {
  const result = startMatch(input);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}

describe("fadiga na partida", () => {
  it("o desgaste é proporcional aos minutos e limitado a 100", () => {
    expect(matchDrain(0, FATIGUE)).toBe(0);
    expect(matchDrain(45, FATIGUE)).toBe(15);
    expect(matchDrain(90, FATIGUE)).toBe(30);
    expect(matchDrain(1000, FATIGUE)).toBe(100);
  });

  it("a força cai com os minutos; sem fadiga ou sem minutos não muda", () => {
    expect(fatiguedStrength(80, 90, FATIGUE)).toBe(70);
    expect(fatiguedStrength(80, 0, FATIGUE)).toBe(80);
    expect(fatiguedStrength(80, 90)).toBe(80);
  });

  it("o time rende menos no fim do jogo do que no começo, e só com a fadiga ligada", () => {
    const base = makeInput(home, away, { seed: "fadiga-1" });
    const tired = (input: MatchInput) => {
      const state = advanceMatch(started(input), { minutes: 80 });
      return strengthOf(state, "home", buildContext(state)).overall;
    };
    const rested = tired(base);
    expect(tired({ ...base, fatigue: FATIGUE })).toBeLessThan(rested);
  });

  it("a partida com fadiga é determinística", () => {
    const input = { ...makeInput(home, away, { seed: "fadiga-2" }), fatigue: FATIGUE };
    expect(simulateMatch(input)).toEqual(simulateMatch(input));
  });
});
