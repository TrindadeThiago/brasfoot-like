import { describe, expect, it } from "vitest";
import { advanceMatch, buildContext, simulateMatch, startMatch } from "../../src/match/engine";
import { fatiguedStrength, matchDrain, strengthOf } from "../../src/match/minute";
import type { MatchFatigue, MatchInput, MatchState } from "../../src/match/types";
import type { Position, Trait } from "../../src/model/catalogs";
import { clubIds, makeInput } from "./helpers/teams";

const [home, away] = clubIds() as [string, string];
const FATIGUE: MatchFatigue = { drainPer90: 30, penaltyBpPerPoint: 40 };

function started(input: MatchInput): MatchState {
  const result = startMatch(input);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.state;
}

describe("fadiga na partida", () => {
  const runner = (id: string, position: Position = "FW", traits: Trait[] = []) => ({
    id,
    position,
    traits,
    strength: 80,
  });

  it("o desgaste é proporcional aos minutos e limitado a 100", () => {
    const player = runner("jogador-1");
    expect(matchDrain(player, 0, FATIGUE)).toBe(0);
    expect(matchDrain(player, 90, FATIGUE)).toBeGreaterThan(matchDrain(player, 45, FATIGUE));
    expect(matchDrain(player, 1000, FATIGUE)).toBe(100);
  });

  it("cada jogador cansa num ritmo: posição, pace e preparo individual", () => {
    const outfield = runner("jogador-1", "MF");
    expect(matchDrain(runner("jogador-1", "GK"), 90, FATIGUE)).toBeLessThan(
      matchDrain(outfield, 90, FATIGUE),
    );
    expect(matchDrain(runner("jogador-1", "MF", ["pace"]), 90, FATIGUE)).toBeGreaterThan(
      matchDrain(outfield, 90, FATIGUE),
    );
    const drains = new Set(
      Array.from({ length: 30 }, (_, i) => matchDrain(runner(`atleta-${i}`, "MF"), 90, FATIGUE)),
    );
    expect(drains.size).toBeGreaterThan(3);
    // O preparo é fixo: o mesmo jogador cansa igual em qualquer jogo.
    expect(matchDrain(outfield, 90, FATIGUE)).toBe(matchDrain(outfield, 90, FATIGUE));
  });

  it("a força cai com os minutos; sem fadiga ou sem minutos não muda", () => {
    const player = runner("jogador-1");
    expect(fatiguedStrength(player, 90, FATIGUE)).toBeLessThan(80);
    expect(fatiguedStrength(player, 0, FATIGUE)).toBe(80);
    expect(fatiguedStrength(player, 90)).toBe(80);
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

  it("avançar em passos dá o mesmo jogo que avançar de uma vez", () => {
    const input = { ...makeInput(home, away, { seed: "fadiga-3" }), fatigue: FATIGUE };
    const whole = advanceMatch(started(input), { toEnd: true });
    let stepped = started(input);
    for (const minutes of [7, 23, 11, 40]) stepped = advanceMatch(stepped, { minutes });
    stepped = advanceMatch(stepped, { toEnd: true });
    expect(stepped.events).toEqual(whole.events);
    expect(stepped.score).toEqual(whole.score);
  });
});
