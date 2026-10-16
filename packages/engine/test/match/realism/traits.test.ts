import { describe, expect, it } from "vitest";
import type { MatchResult } from "../../../src/match/types.js";
import type { Position, Trait } from "../../../src/model/catalogs.js";
import type { CompletedPlayer } from "../../../src/model/types.js";
import { clubIds, squadOf } from "../helpers/teams.js";
import { cloneSquad, play, team } from "./harness.js";

interface TraitCase {
  trait: Trait;
  positions: Position[];
  /** Estatística do time A numa partida. */
  stat(result: MatchResult, side: "home" | "away"): { value: number; weight: number };
  direction: "up" | "down";
}

const shots = (result: MatchResult, side: "home" | "away") =>
  result.events.filter((event) => event.type === "shot" && event.side === side);

const CASES: TraitCase[] = [
  {
    trait: "finisher",
    positions: ["FW", "MF"],
    stat: (result, side) => {
      const onTarget = shots(result, side).filter(
        (event) => event.type === "shot" && (event.outcome === "goal" || event.outcome === "saved"),
      );
      const goals = onTarget.filter((event) => event.type === "shot" && event.outcome === "goal");
      return { value: goals.length, weight: onTarget.length };
    },
    direction: "up",
  },
  {
    trait: "heading",
    positions: ["CB", "FW"],
    stat: (result, side) => ({
      value: shots(result, side).filter(
        (event) => event.type === "shot" && event.kind === "header" && event.outcome === "goal",
      ).length,
      weight: 1,
    }),
    direction: "up",
  },
  {
    trait: "wall",
    positions: ["GK", "CB"],
    stat: (result, side) => ({ value: result.score[side === "home" ? "away" : "home"], weight: 1 }),
    direction: "down",
  },
  {
    trait: "free-kick",
    positions: ["MF", "FW"],
    stat: (result, side) => ({
      value: shots(result, side).filter(
        (event) =>
          event.type === "shot" &&
          (event.kind === "free_kick" || event.kind === "penalty") &&
          event.outcome === "goal",
      ).length,
      weight: 1,
    }),
    direction: "up",
  },
  {
    trait: "pace",
    positions: ["FW", "FB"],
    stat: (result, side) => ({
      value: shots(result, side).filter(
        (event) => event.type === "shot" && event.kind === "counter",
      ).length,
      weight: 1,
    }),
    direction: "up",
  },
  {
    trait: "playmaker",
    positions: ["MF", "DM"],
    stat: (result, side) => ({ value: shots(result, side).length, weight: 1 }),
    direction: "up",
  },
];

function withTraits(squad: CompletedPlayer[], trait: Trait | null, positions: Position[]) {
  return squad.map((player) => ({
    ...player,
    traits: trait && positions.includes(player.position) ? [trait] : [],
  }));
}

function measure(traitCase: TraitCase, withTrait: boolean, perClub: number): number {
  let value = 0;
  let weight = 0;
  for (const clubId of clubIds().slice(0, 12)) {
    const squad = squadOf(clubId);
    const tag = withTrait ? traitCase.trait : "none";
    const aSquad = cloneSquad(
      withTraits(squad, withTrait ? traitCase.trait : null, traitCase.positions),
      `${tag}-`,
      `${clubId}-${tag}`,
    );
    const bSquad = cloneSquad(withTraits(squad, null, []), "b-", `${clubId}-b`);
    const a = team(`${clubId}-${tag}`, aSquad);
    const b = team(`${clubId}-b`, bSquad);
    for (let index = 0; index < perClub; index++) {
      const aIsHome = index % 2 === 0;
      const result = play({
        home: aIsHome ? a : b,
        away: aIsHome ? b : a,
        seed: `carac:${clubId}:${index}`,
      });
      const stat = traitCase.stat(result, aIsHome ? "home" : "away");
      value += stat.value;
      weight += stat.weight;
    }
  }
  return value / weight;
}

describe("características têm efeito mensurável (FR-009, SC-003)", () => {
  it.each(CASES.map((traitCase) => [traitCase.trait, traitCase] as const))(
    "%s",
    (_, traitCase) => {
      const without = measure(traitCase, false, 200);
      const withTrait = measure(traitCase, true, 200);
      const effect = withTrait / without;
      if (traitCase.direction === "up")
        expect(effect, `efeito ${effect.toFixed(3)}`).toBeGreaterThan(1.05);
      else expect(effect, `efeito ${effect.toFixed(3)}`).toBeLessThan(0.95);
    },
    120000,
  );
});
