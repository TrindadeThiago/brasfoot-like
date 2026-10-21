import type { InjurySeverity, Side } from "../match/types";
import type { CompletedBank } from "../model/types";
import { createRng } from "../rng/xoshiro";
import {
  DEFAULT_DISCIPLINE_RULES,
  type DisciplineRules,
  type MatchRecord,
  type PlayerStatus,
} from "./types";

/** Regras de cartões da competição (017 R6): as do mod sobre as de sempre. */
export function disciplineRules(
  world: Pick<CompletedBank, "competitions">,
  competitionId: string,
): DisciplineRules {
  const declared = world.competitions.find((entry) => entry.id === competitionId)?.discipline ?? {};
  return {
    yellowsForSuspension:
      declared.yellowsForSuspension ?? DEFAULT_DISCIPLINE_RULES.yellowsForSuspension,
    matchesPerRed: declared.matchesPerRed ?? DEFAULT_DISCIPLINE_RULES.matchesPerRed,
  };
}

/** Partidas de afastamento por gravidade de lesão (FR-018). */
export const INJURY_MATCHES: Record<InjurySeverity, readonly [number, number]> = {
  minor: [1, 2],
  moderate: [3, 6],
  severe: [7, 15],
};

/** Duração de uma lesão, sorteada de forma determinística pela seed da temporada (research R7). */
export function injuryDuration(
  severity: InjurySeverity,
  seed: string | number,
  round: number,
  playerId: string,
): number {
  const [min, max] = INJURY_MATCHES[severity];
  return createRng(`${seed}:r${round}:${playerId}:injury`).int(min, max);
}

function entry(status: Record<string, PlayerStatus>, playerId: string): PlayerStatus {
  let current = status[playerId];
  if (!current) {
    current = { yellows: 0, suspension: 0, injury: 0 };
    status[playerId] = current;
  }
  return current;
}

/**
 * Atualiza a situação dos jogadores de um lado depois de uma partida (FR-015 a FR-018):
 * quem estava indisponível cumpre uma partida; cartões geram suspensões; lesões afastam.
 * Altera `status` (cópia de trabalho da temporada).
 */
export function applyMatchToStatus(
  status: Record<string, PlayerStatus>,
  record: MatchRecord,
  side: Side,
  rules: DisciplineRules,
  seed: string | number,
): void {
  for (const absence of record.unavailable[side]) {
    const current = status[absence.playerId];
    if (!current) continue;
    current.suspension = Math.max(0, current.suspension - 1);
    current.injury = Math.max(0, current.injury - 1);
  }

  for (const [playerId, line] of Object.entries(record.players)) {
    if (line.side !== side) continue;
    if (line.red) {
      // Expulsão: os amarelos desta partida não acumulam (FR-016).
      entry(status, playerId).suspension += rules.matchesPerRed;
    } else if (line.yellows > 0) {
      const current = entry(status, playerId);
      current.yellows += line.yellows;
      if (current.yellows >= rules.yellowsForSuspension) {
        current.suspension += 1;
        current.yellows = 0;
      }
    }
    if (line.injury) {
      const current = entry(status, playerId);
      current.injury = Math.max(
        current.injury,
        injuryDuration(line.injury, seed, record.round, playerId),
      );
    }
  }

  for (const [playerId, current] of Object.entries(status)) {
    if (current.yellows === 0 && current.suspension === 0 && current.injury === 0)
      delete status[playerId];
  }
}
