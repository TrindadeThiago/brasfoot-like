import { describe, expect, it } from "vitest";
import { MATCH_REALISM_LIMITS as L } from "../../../src/match/limits";
import { clubIds, squadOf } from "../helpers/teams";
import { cloneSquad, emptyOutcome, play, rateOf, record, team } from "./harness";

/** Cada clube contra uma cópia de si mesmo: forças idênticas. */
function equalMatches(neutral: boolean, perClub: number) {
  const outcome = emptyOutcome();
  for (const clubId of clubIds().slice(0, 20)) {
    const squad = squadOf(clubId);
    const home = team(clubId, squad);
    const away = team(`${clubId}-copia`, cloneSquad(squad, "c-", `${clubId}-copia`));
    for (let index = 0; index < perClub; index++) {
      const result = play({ home, away, neutral, seed: `mando:${neutral}:${clubId}:${index}` });
      record(outcome, result, true);
    }
  }
  return outcome;
}

describe("vantagem de jogar em casa (FR-042)", () => {
  it("entre forças iguais, o mandante vence mais", () => {
    const outcome = equalMatches(false, 250);
    const home = rateOf(outcome, "wins");
    const away = rateOf(outcome, "losses");
    expect(home, `mandante ${home.toFixed(3)}`).toBeGreaterThanOrEqual(L.equalHomeWinRate[0]);
    expect(home).toBeLessThanOrEqual(L.equalHomeWinRate[1]);
    expect(away, `visitante ${away.toFixed(3)}`).toBeGreaterThanOrEqual(L.equalAwayWinRate[0]);
    expect(away).toBeLessThanOrEqual(L.equalAwayWinRate[1]);
  }, 120000);

  it("em campo neutro, ninguém tem vantagem", () => {
    const outcome = equalMatches(true, 250);
    const gap = Math.abs(rateOf(outcome, "wins") - rateOf(outcome, "losses"));
    expect(gap, `diferença ${gap.toFixed(3)}`).toBeLessThan(L.maxNeutralWinGap);
  }, 120000);
});
