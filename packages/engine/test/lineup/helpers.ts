import type { Unavailability } from "../../src/lineup/types";
import { FORMATIONS, type FormationId, slotPosition } from "../../src/match/formations";
import { effectiveStrength } from "../../src/match/strength";
import type { Lineup } from "../../src/match/types";
import type { CompletedPlayer } from "../../src/model/types";
import { testWorld } from "../season/helpers/world";

export function serieAClubs(): string[] {
  return testWorld().competitions[0]?.divisions[0]?.clubIds ?? [];
}

export function squadOf(clubId: string): CompletedPlayer[] {
  return testWorld().players.filter((player) => player.clubId === clubId);
}

export function firstClub(): { clubId: string; squad: CompletedPlayer[] } {
  const clubId = serieAClubs()[0] as string;
  return { clubId, squad: squadOf(clubId) };
}

export function injured(playerId: string, remaining = 2): Unavailability {
  return { playerId, reason: "injury", remaining };
}

export function suspended(playerId: string, remaining = 1): Unavailability {
  return { playerId, reason: "suspension", remaining };
}

export function startersOf(lineup: Lineup): string[] {
  return Object.values(lineup.starters).sort();
}

export function totalStrength(lineup: Lineup, squad: readonly CompletedPlayer[]): number {
  const byId = new Map(squad.map((player) => [player.id, player]));
  let total = 0;
  for (const [slotId, playerId] of Object.entries(lineup.starters)) {
    const position = slotPosition(lineup.formation, slotId);
    const player = byId.get(playerId);
    if (position && player) total += effectiveStrength(player, position);
  }
  return total;
}

export function slotIds(formation: FormationId): string[] {
  return FORMATIONS[formation].slots.map((slot) => slot.id);
}
