import { describe, expect, it } from "vitest";
import { MATCH_REALISM_LIMITS as L } from "../../../src/match/limits";
import { clubIds, squadOf, withStrengthDelta } from "../helpers/teams";
import { cloneSquad, emptyOutcome, play, rateOf, record, team } from "./harness";

/** Time A = clube com força deslocada em `delta`; B = cópia original. Mando alternado. */
function favouriteOutcome(delta: number, perClub: number) {
  const outcome = emptyOutcome();
  for (const clubId of clubIds().slice(0, 20)) {
    const squad = squadOf(clubId);
    const a = team(
      `${clubId}+${delta}`,
      cloneSquad(withStrengthDelta(squad, delta), `f${delta}-`, `${clubId}+${delta}`),
    );
    const b = team(clubId, squad);
    for (let index = 0; index < perClub; index++) {
      const aIsHome = index % 2 === 0;
      const result = play({
        home: aIsHome ? a : b,
        away: aIsHome ? b : a,
        seed: `forca:${delta}:${clubId}:${index}`,
      });
      record(outcome, result, aIsHome);
    }
  }
  return outcome;
}

describe("favoritos e zebras (FR-043)", () => {
  it("10 pontos a mais: vence a maioria, mas perde às vezes", () => {
    const outcome = favouriteOutcome(L.favouriteGap, 200);
    const wins = rateOf(outcome, "wins");
    const losses = rateOf(outcome, "losses");
    expect(wins, `vitórias ${wins.toFixed(3)}`).toBeGreaterThanOrEqual(L.minFavouriteWinRate);
    expect(losses, `derrotas ${losses.toFixed(3)}`).toBeGreaterThanOrEqual(L.favouriteLossRate[0]);
    expect(losses).toBeLessThanOrEqual(L.favouriteLossRate[1]);
  }, 120000);

  it("quanto maior a diferença, maior a taxa de vitória", () => {
    const rates = [5, 10, 15].map((delta) => rateOf(favouriteOutcome(delta, 80), "wins"));
    expect(rates[0]).toBeLessThan(rates[1] as number);
    expect(rates[1]).toBeLessThan(rates[2] as number);
  }, 120000);
});
