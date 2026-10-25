import { clampReputation } from "../board/reputation";
import type { LeagueSeason, TurnoverStep } from "../career/types";
import type { CompletedBank } from "../model/types";
import { reachedAtLeast, reachedByClub } from "./reached";
import { CONTINENTAL_TUNING } from "./rules";

/**
 * Reputação do clube pela fase mais alta alcançada numa competição entre países (022 R5): a tabela
 * `awards.reputation` da competição dá os pontos, e o teto `reputationCeiling` impede inflação
 * (um clube já acima do teto não perde nem ganha). Pura e determinística.
 */

export interface ReputationChange {
  clubId: string;
  competitionId: string;
  delta: number;
}

export function continentalReputation(
  world: CompletedBank,
  finished: readonly LeagueSeason[],
): { clubs: Record<string, number>; changes: ReputationChange[] } {
  const reputation = new Map(world.clubs.map((club) => [club.id, club.reputation]));
  const changes: ReputationChange[] = [];
  for (const league of finished) {
    const competition = world.competitions.find((entry) => entry.id === league.competitionId);
    const table = competition?.awards?.reputation;
    const season = league.divisions[0];
    if (competition?.countryId !== undefined || !table || table.length === 0 || !season) continue;
    const ceiling = Math.min(
      100,
      competition.awards?.reputationCeiling ?? CONTINENTAL_TUNING.reputationCeiling,
    );
    const reached = reachedByClub(world, season);
    for (const [clubId, level] of [...reached].sort(([a], [b]) => (a < b ? -1 : 1))) {
      // A tabela cresce com a fase: vale a última entrada que o clube alcançou.
      let points = 0;
      for (const entry of table) {
        if (reachedAtLeast(level, entry.reached)) points = entry.points;
      }
      const current = reputation.get(clubId);
      if (points === 0 || current === undefined) continue;
      // O ganho respeita o teto; a perda (pontos negativos) não, e nunca passa do mínimo.
      if (points > 0 && current >= ceiling) continue;
      const next = clampReputation(
        points > 0 ? Math.min(ceiling, current + points) : current + points,
      );
      reputation.set(clubId, next);
      changes.push({ clubId, competitionId: league.competitionId, delta: next - current });
    }
  }
  const clubs: Record<string, number> = {};
  for (const change of changes) clubs[change.clubId] = reputation.get(change.clubId) as number;
  return { clubs, changes };
}

/** Etapa da virada: aplica a reputação ganha na competição ao mundo vivo (022 R5). */
export const continentalReputationStep: TurnoverStep = {
  id: "continental-reputation",
  run: (context) => {
    const finished = context.finishedCompetitions ?? [];
    const { clubs, changes } = continentalReputation(context.world, finished);
    if (changes.length === 0) return context;
    return {
      ...context,
      world: {
        ...context.world,
        clubs: context.world.clubs.map((club) =>
          clubs[club.id] === undefined ? club : { ...club, reputation: clubs[club.id] as number },
        ),
      },
    };
  },
};
