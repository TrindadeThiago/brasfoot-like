import { nextComposition } from "../career/composition";
import type { LeagueSeason } from "../career/types";
import { tieState } from "../knockout/tie";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { cupView } from "../stages/cup-view";
import { finalOrder } from "../stages/ranking";
import { isRegional } from "./scope";
import type { RegionalDivisionResult, RegionalEdition } from "./types";

/** A final da última fase eliminatória da divisão já foi decidida? */
function finalDecided(season: Season, world: CompletedBank): boolean {
  const last = season.stages?.at(-1);
  if (!last?.bracket) return false;
  const view = cupView(season, world, last.index);
  const phase = view.bracket?.phases.at(-1);
  const tie = phase?.ties[0];
  return phase !== undefined && tie !== undefined && tieState(view, phase.index, tie.id).decided;
}

/**
 * Edição encerrada de um estadual, para o histórico (023 R8): campeão, vice, promovidos e
 * rebaixados de cada divisão. Indefinida se o estadual não é regional ou se alguma divisão ainda não
 * decidiu a final.
 */
export function regionalEdition(
  world: CompletedBank,
  league: LeagueSeason,
): RegionalEdition | undefined {
  const competition = world.competitions.find((entry) => entry.id === league.competitionId);
  if (!competition || !isRegional(competition)) return undefined;
  const change = nextComposition(league, world);
  const divisions: RegionalDivisionResult[] = [];
  for (const season of [...league.divisions].sort((a, b) => a.divisionLevel - b.divisionLevel)) {
    const decided = finalDecided(season, world);
    const order = finalOrder(season, world);
    const [championId, runnerUpId] = order;
    if (!decided || championId === undefined || runnerUpId === undefined) return undefined;
    divisions.push({
      level: season.divisionLevel,
      championId,
      runnerUpId,
      promotedIds: [...(change.promoted[season.divisionLevel] ?? [])],
      relegatedIds: [...(change.relegated[season.divisionLevel] ?? [])],
    });
  }
  return {
    number: league.number,
    year: league.year,
    competitionId: league.competitionId,
    divisions,
  };
}

/** As edições dos estaduais entre as temporadas encerradas, na ordem recebida. */
export function regionalEditions(
  world: CompletedBank,
  finished: readonly LeagueSeason[],
): RegionalEdition[] {
  return finished.flatMap((league) => regionalEdition(world, league) ?? []);
}
