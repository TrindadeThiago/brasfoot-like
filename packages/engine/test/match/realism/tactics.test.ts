import { describe, expect, it } from "vitest";
import type { Posture } from "../../../src/match/formations.js";
import { MATCH_REALISM_LIMITS as L } from "../../../src/match/limits.js";
import type { MatchState } from "../../../src/match/types.js";
import { clubIds, squadOf, withStrengthDelta } from "../helpers/teams.js";
import { cloneSquad, emptyOutcome, play, rateOf, record, team } from "./harness.js";

const CLUBS = clubIds().slice(0, 15);

type SideInjection = { minute: number; apply(state: MatchState, side: "home" | "away"): void };

/** A (com tratamento) contra a cópia B; mesmas seeds em todos os cenários. */
function scenario(posture: Posture, perClub: number, injection?: SideInjection, aDelta = 0) {
  const outcome = emptyOutcome();
  let possession = 0;
  for (const clubId of CLUBS) {
    const squad = squadOf(clubId);
    const a = team(
      `${clubId}-a${aDelta}`,
      cloneSquad(withStrengthDelta(squad, aDelta), `a${aDelta}-`, `${clubId}-a${aDelta}`),
      "4-4-2",
      posture,
    );
    const b = team(`${clubId}-b`, cloneSquad(squad, "b-", `${clubId}-b`));
    for (let index = 0; index < perClub; index++) {
      const aIsHome = index % 2 === 0;
      const result = play(
        { home: aIsHome ? a : b, away: aIsHome ? b : a, seed: `tatica:${clubId}:${index}` },
        injection && {
          minute: injection.minute,
          apply: (state) => injection.apply(state, aIsHome ? "home" : "away"),
        },
      );
      record(outcome, result, aIsHome);
      possession += aIsHome ? result.stats.home.possession : result.stats.away.possession;
    }
  }
  return { ...outcome, possession: possession / outcome.matches };
}

describe("postura e expulsão (FR-044, FR-045)", () => {
  const base = scenario("balanced", 200);

  it("postura ofensiva aumenta gols marcados e sofridos", () => {
    const attacking = scenario("attacking", 200);
    expect(attacking.goalsFor / base.goalsFor).toBeGreaterThanOrEqual(1 + L.minPostureEffect);
    expect(attacking.goalsAgainst / base.goalsAgainst).toBeGreaterThanOrEqual(
      1 + L.minPostureEffect,
    );
  }, 120000);

  it("postura defensiva reduz gols marcados e sofridos", () => {
    const defensive = scenario("defensive", 200);
    expect(defensive.goalsFor / base.goalsFor).toBeLessThanOrEqual(1 - L.minPostureEffect);
    expect(defensive.goalsAgainst / base.goalsAgainst).toBeLessThanOrEqual(1 - L.minPostureEffect);
  }, 120000);

  it("um expulso até o minuto 30 reduz a taxa de vitória", () => {
    const redCard: SideInjection = {
      minute: 20,
      apply: (state, side) => {
        const team = state.teams[side];
        const playerId = team.onField.lcm;
        team.onField.lcm = null;
        if (playerId) {
          const player = team.players[playerId];
          if (player) player.sentOff = true;
        }
      },
    };
    const reduced = scenario("balanced", 200, redCard);
    const drop = rateOf(base, "wins") - rateOf(reduced, "wins");
    expect(drop, `queda ${drop.toFixed(3)}`).toBeGreaterThanOrEqual(L.minRedCardWinDrop);
  }, 120000);

  it("meio-campo mais forte tem mais posse", () => {
    const stronger = scenario("balanced", 60, undefined, 10);
    expect(stronger.possession).toBeGreaterThan(52);
  }, 120000);
});
