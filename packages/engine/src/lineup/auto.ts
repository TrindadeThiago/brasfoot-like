import type { FormationId, Posture } from "../match/formations";
import type { Lineup } from "../match/types";
import type { CompletedPlayer } from "../model/types";
import { lineupForMatch } from "../season/lineups";
import type { Unavailability } from "./types";

/**
 * Escalação automática do clube do jogador: exatamente a que a temporada daria ao clube no
 * esquema (mesma rotina dos clubes do computador), só com a postura escolhida (research.md R2).
 */
export function managerAutoLineup(
  squad: readonly CompletedPlayer[],
  formation: FormationId,
  posture: Posture,
  unavailable: readonly Unavailability[],
): { lineup: Lineup; fielded: string[] } {
  const { lineup, fielded } = lineupForMatch(squad, formation, unavailable);
  return { lineup: { ...lineup, posture }, fielded };
}
