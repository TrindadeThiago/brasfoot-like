import { nextComposition } from "../career/composition";
import type { LeagueSeason } from "../career/types";
import { cupSeasonOf } from "../knockout/history";
import type { CompletedBank } from "../model/types";
import { feedableCompetitions } from "./order";
import { type ResolveOutcome, resolveQualification } from "./resolve";

/**
 * Resolve as vagas das temporadas encerradas de um mundo (021 R2): a composição das pirâmides vem de
 * `nextComposition`. É o que a etapa de virada faz e o que a tela de fim de temporada mostra antes
 * da virada. Sem vagas no banco devolve `undefined`.
 */
export function resolveFinishedSeasons(
  world: CompletedBank,
  finished: readonly LeagueSeason[],
  main: LeagueSeason,
): ResolveOutcome | undefined {
  if (feedableCompetitions(world.competitions).length === 0) return undefined;
  const compositions: Record<string, Record<number, readonly string[]>> = {};
  for (const league of finished) {
    if (cupSeasonOf(league)) continue;
    compositions[league.competitionId] = nextComposition(league, world).composition;
  }
  return resolveQualification({
    world,
    finished,
    compositions,
    number: main.number,
    year: main.year,
  });
}
