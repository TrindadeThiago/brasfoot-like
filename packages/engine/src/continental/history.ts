import type { HistoryRow, LeagueSeason } from "../career/types";
import { cupEntry } from "../knockout/history";
import type { CompletedBank } from "../model/types";
import { groupTables } from "../stages/classification";
import { cupView } from "../stages/cup-view";
import { finalOf, reachedByClub } from "./reached";
import type { ContinentalEdition } from "./types";

/**
 * Edição encerrada de uma competição entre países, para o histórico (022 R8): campeão, vice, a
 * final, a melhor fase de cada clube e as tabelas finais da (primeira) fase de grupos. Indefinida
 * até a final se decidir.
 */
export function continentalEdition(
  world: CompletedBank,
  league: LeagueSeason,
): ContinentalEdition | undefined {
  const season = league.divisions[0];
  if (!season || !finalOf(world, season)) return undefined;
  const last = season.stages?.at(-1);
  const view = season.bracket ? season : last ? cupView(season, world, last.index) : undefined;
  const entry = view ? cupEntry({ ...league, divisions: [view] }) : undefined;
  if (!entry) return undefined;

  const reached: ContinentalEdition["reached"] = {};
  for (const [clubId, level] of [...reachedByClub(world, season)].sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    reached[clubId] = level;
  }
  const groupsStage = (season.stages ?? []).find(
    (stage) => stage.kind === "groups" && stage.started,
  );
  const groups = groupsStage
    ? groupTables(season, world, groupsStage.index).map(({ group, rows }) => ({
        id: group.id,
        table: rows.map(
          (row): HistoryRow => ({
            position: row.position,
            clubId: row.clubId,
            points: row.points,
            played: row.played,
            wins: row.wins,
            draws: row.draws,
            losses: row.losses,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
          }),
        ),
      }))
    : undefined;
  return {
    number: league.number,
    year: league.year,
    competitionId: league.competitionId,
    championId: entry.championId,
    runnerUpId: entry.runnerUpId,
    final: entry.final,
    reached,
    ...(groups ? { groups } : {}),
  };
}
