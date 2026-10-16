import { autoLineup } from "../match/auto-lineup";
import { FORMATION_IDS, type FormationId, slotPosition } from "../match/formations";
import { effectiveStrength } from "../match/strength";
import type { Lineup } from "../match/types";
import type { CompletedPlayer } from "../model/types";

export const SEASON_BENCH_LIMIT = 12;

function lineupValue(lineup: Lineup, squad: readonly CompletedPlayer[]): number {
  const byId = new Map(squad.map((player) => [player.id, player]));
  let total = 0;
  for (const [slotId, playerId] of Object.entries(lineup.starters)) {
    const position = slotPosition(lineup.formation, slotId);
    const player = byId.get(playerId);
    if (position && player) total += effectiveStrength(player, position);
  }
  return total;
}

/**
 * Esquema preferido do clube: o do catálogo cuja escalação automática (elenco completo) tem a
 * maior força efetiva; empate fica com o primeiro do catálogo (research.md R8).
 */
export function preferredFormation(squad: readonly CompletedPlayer[]): FormationId {
  let best: FormationId = FORMATION_IDS[0];
  let bestValue = Number.NEGATIVE_INFINITY;
  for (const formation of FORMATION_IDS) {
    const result = autoLineup({ squad, formation });
    if (!result.ok) continue;
    const value = lineupValue(result.lineup, squad);
    if (value > bestValue + 1e-9) {
      best = formation;
      bestValue = value;
    }
  }
  return best;
}

export interface MatchLineup {
  lineup: Lineup;
  /** Indisponíveis que precisaram ser escalados por falta de jogadores (FR-020). */
  fielded: string[];
}

/**
 * Escalação de um clube para uma partida da temporada, sem os indisponíveis. Se faltarem
 * jogadores, devolve ao elenco os de menor impedimento (`remaining` = partidas restantes).
 */
export function lineupForMatch(
  squad: readonly CompletedPlayer[],
  formation: FormationId,
  unavailable: readonly { playerId: string; remaining: number }[],
): MatchLineup {
  const blocked = [...unavailable].sort(
    (a, b) => a.remaining - b.remaining || a.playerId.localeCompare(b.playerId),
  );
  const fielded: string[] = [];
  for (;;) {
    const result = autoLineup({
      squad,
      formation,
      posture: "balanced",
      unavailable: blocked.map((entry) => entry.playerId),
      benchLimit: SEASON_BENCH_LIMIT,
    });
    if (result.ok) return { lineup: result.lineup, fielded };
    const released = blocked.shift();
    if (!released) throw new Error("elenco sem 11 jogadores");
    fielded.push(released.playerId);
  }
}
