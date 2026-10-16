import type { CompletedBank, CompletedPlayer } from "../model/types";
import type { PlayerStatus, Season } from "../season/types";
import type { Unavailability } from "./types";

/** Indisponíveis de um elenco, na ordem do elenco (lesão prevalece sobre suspensão). */
export function unavailabilityOf(
  squad: readonly CompletedPlayer[],
  status: Record<string, PlayerStatus>,
): Unavailability[] {
  const result: Unavailability[] = [];
  for (const player of squad) {
    const entry = status[player.id];
    if (!entry || (entry.injury <= 0 && entry.suspension <= 0)) continue;
    result.push({
      playerId: player.id,
      reason: entry.injury > 0 ? "injury" : "suspension",
      remaining: Math.max(entry.injury, entry.suspension),
    });
  }
  return result;
}

/** Indisponíveis do clube agora, por partidas restantes e id. */
export function clubUnavailability(
  season: Season,
  world: CompletedBank,
  clubId: string,
): Unavailability[] {
  const squad = world.players.filter((player) => player.clubId === clubId);
  return unavailabilityOf(squad, season.status).sort(
    (a, b) => a.remaining - b.remaining || a.playerId.localeCompare(b.playerId),
  );
}
