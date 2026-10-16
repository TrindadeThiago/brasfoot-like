import { describe, expect, it } from "vitest";
import { adjustLineup } from "../../src/lineup/adjust";
import { managerAutoLineup } from "../../src/lineup/auto";
import { changeFormation } from "../../src/lineup/formation";
import { clubUnavailability } from "../../src/lineup/unavailability";
import { validateLineup } from "../../src/lineup/validate";
import type { Lineup } from "../../src/match/types";
import { advanceSeason, isSeasonOver } from "../../src/season/season";
import type { Season } from "../../src/season/types";
import { newSeason, testWorld } from "../season/helpers/world";
import { firstClub } from "./helpers";

function playWithManager(seed: string): { season: Season; adjustments: number } {
  const world = testWorld();
  const { clubId, squad } = firstClub();
  let season = newSeason(seed);
  let lineup: Lineup = changeFormation(
    managerAutoLineup(squad, "4-4-2", "attacking", []).lineup,
    "3-5-2",
    squad,
  );
  let adjustments = 0;
  while (!isSeasonOver(season)) {
    const unavailable = clubUnavailability(season, world, clubId);
    const adjusted = adjustLineup(lineup, squad, unavailable);
    if (adjusted.changes.length > 0) adjustments++;
    lineup = adjusted.lineup;
    const validation = validateLineup(lineup, squad, unavailable);
    expect(validation.valid).toBe(true);
    const short = validation.issues.some((issue) => issue.code === "short_squad");
    const result = advanceSeason(
      season,
      world,
      { rounds: 1 },
      short ? undefined : { [clubId]: lineup },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) break;
    season = result.season;
  }
  return { season, adjustments };
}

describe("temporada inteira com a escalação do jogador (SC-001, SC-005)", () => {
  it("nenhuma rodada é recusada, o ajuste resolve as ausências e é determinístico", () => {
    const first = playWithManager("manager-1");
    expect(first.season.records).toHaveLength(380);
    expect(first.adjustments).toBeGreaterThan(0);
    const second = playWithManager("manager-1");
    expect(second.season.records.map((record) => record.score)).toEqual(
      first.season.records.map((record) => record.score),
    );
  });
});
