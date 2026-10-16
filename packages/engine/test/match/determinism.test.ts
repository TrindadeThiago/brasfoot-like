import { describe, expect, it } from "vitest";
import { simulateMatch } from "../../src/match/engine.js";
import type { MatchResult } from "../../src/match/types.js";
import { clubIds, makeInput, naturalLineup, squadOf } from "./helpers/teams.js";

const [HOME, AWAY] = clubIds() as [string, string];

function run(seed: number, input = makeInput(HOME, AWAY, { seed })): MatchResult {
  const outcome = simulateMatch(input);
  if (!outcome.ok) throw new Error(JSON.stringify(outcome.errors));
  return outcome.result;
}

describe("determinismo (FR-018, SC-001)", () => {
  it.each(Array.from({ length: 30 }, (_, index) => index + 1))(
    "seed %i: mesma entrada ⇒ mesmo resultado",
    (seed) => {
      expect(run(seed)).toEqual(run(seed));
    },
  );

  it("seeds diferentes produzem partidas diferentes", () => {
    expect(run(1).events).not.toEqual(run(2).events);
  });

  it("trocar um titular muda o resultado em ao menos uma de 30 seeds", () => {
    const squad = squadOf(HOME);
    const lineup = naturalLineup(squad);
    const benchPlayer = lineup.bench[0] as string;
    const altered = { ...lineup, starters: { ...lineup.starters, ls: benchPlayer } };
    altered.bench = lineup.bench.slice(1).concat(lineup.starters.ls as string);
    const changed = Array.from({ length: 30 }, (_, index) => index + 1).some((seed) => {
      const input = makeInput(HOME, AWAY, { seed });
      input.home.lineup = altered;
      return JSON.stringify(run(seed, input).events) !== JSON.stringify(run(seed).events);
    });
    expect(changed).toBe(true);
  });
});
