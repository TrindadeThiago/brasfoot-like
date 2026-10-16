import { describe, expect, it } from "vitest";
import { autoLineup } from "../../src/match/auto-lineup.js";
import { FORMATION_IDS, slotPosition } from "../../src/match/formations.js";
import { effectiveStrength } from "../../src/match/strength.js";
import type { Lineup } from "../../src/match/types.js";
import type { CompletedPlayer } from "../../src/model/types.js";
import { preferredFormation } from "../../src/season/lineups.js";
import { advanceSeason } from "../../src/season/season.js";
import { newSeason, testWorld } from "./helpers/world.js";

function total(lineup: Lineup, squad: CompletedPlayer[]): number {
  const byId = new Map(squad.map((player) => [player.id, player]));
  return Object.entries(lineup.starters).reduce((sum, [slot, id]) => {
    const position = slotPosition(lineup.formation, slot);
    const player = byId.get(id);
    return position && player ? sum + effectiveStrength(player, position) : sum;
  }, 0);
}

const squadOf = (clubId: string) =>
  testWorld().players.filter((player) => player.clubId === clubId);

describe("esquema preferido e escalações (FR-007, FR-008)", () => {
  it("é o esquema do catálogo de maior força efetiva e é determinístico", () => {
    for (const club of testWorld().clubs.slice(0, 20)) {
      const squad = squadOf(club.id);
      const chosen = preferredFormation(squad);
      expect(FORMATION_IDS).toContain(chosen);
      expect(preferredFormation([...squad].reverse())).toBe(chosen);
      const values = FORMATION_IDS.map((formation) => {
        const result = autoLineup({ squad, formation });
        return result.ok ? total(result.lineup, squad) : 0;
      });
      expect(
        total((autoLineup({ squad, formation: chosen }) as { lineup: Lineup }).lineup, squad),
      ).toBeCloseTo(Math.max(...values));
    }
  });

  it("todo clube da Série A recebe um esquema", () => {
    const season = newSeason(1);
    for (const clubId of season.clubIds) expect(season.formations[clubId]).toBeDefined();
  });

  it("escalação externa é usada na partida do clube", () => {
    const season = newSeason(1);
    const fixture = season.calendar[0]?.fixtures[0];
    if (!fixture) throw new Error("sem jogo");
    const squad = squadOf(fixture.home);
    const lineup = (
      autoLineup({ squad, formation: "5-3-2", posture: "defensive" }) as { lineup: Lineup }
    ).lineup;
    const result = advanceSeason(season, testWorld(), { rounds: 1 }, { [fixture.home]: lineup });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const record = result.season.records.find((entry) => entry.home === fixture.home);
    for (const playerId of Object.values(lineup.starters)) {
      expect(record?.players[playerId]).toBeDefined();
    }
  });
});
