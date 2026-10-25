import type { LeagueSeason } from "../career/types";
import { cupSeasonOf } from "../knockout/history";
import { cupChampion, cupReached } from "../knockout/tie";
import type { BerthSource, CompletedBank } from "../model/types";
import { standings } from "../season/standings";
import { QualificationSourceError } from "./errors";

/**
 * Lista ordenada de clubes que uma fonte de vaga oferece (021 R1, R3). Lê só temporadas
 * encerradas; a ordem é sempre total (posição, depois id), sem sorteio.
 */

export type FinishedSeasons = ReadonlyMap<string, LeagueSeason>;

export function finishedByCompetition(finished: readonly LeagueSeason[]): FinishedSeasons {
  return new Map(finished.map((league) => [league.competitionId, league]));
}

function seasonOf(finished: FinishedSeasons, competitionId: string): LeagueSeason {
  const league = finished.get(competitionId);
  if (!league) throw new QualificationSourceError(competitionId);
  return league;
}

/** Tabela final de uma divisão (posição 1 primeiro). */
function tableOf(
  world: CompletedBank,
  league: LeagueSeason,
  level: number,
): { clubId: string; position: number }[] {
  const season = league.divisions.find((entry) => entry.divisionLevel === level);
  if (!season) throw new QualificationSourceError(league.competitionId);
  return standings(season, world).map((row) => ({ clubId: row.clubId, position: row.position }));
}

/** Quantos clubes a fonte oferece (o tamanho da vaga). */
export function berthSize(world: Pick<CompletedBank, "competitions">, source: BerthSource): number {
  switch (source.kind) {
    case "position":
      return source.to - source.from + 1;
    case "champion":
    case "runnerUp":
      return 1;
    case "reached": {
      const competition = world.competitions.find((entry) => entry.id === source.competitionId);
      const clubs = competition?.divisions[0]?.clubIds.length ?? 0;
      if (competition?.format.type !== "knockout") return 0;
      const entering = new Map(
        (competition.format.entries ?? []).map((entry) => [entry.phase, entry.clubIds.length]),
      );
      const late = [...entering.values()].reduce((sum, value) => sum + value, 0);
      let count = clubs - late;
      for (let phase = 1; phase < source.phase; phase++) {
        count = count / 2 + (entering.get(phase) ?? 0);
      }
      return count;
    }
  }
}

/** Clubes da fonte, do mais bem colocado ao menos. */
export function poolOf(
  world: CompletedBank,
  finished: FinishedSeasons,
  source: BerthSource,
): { clubId: string; position?: number }[] {
  const league = seasonOf(finished, source.competitionId);
  const cup = cupSeasonOf(league);
  switch (source.kind) {
    case "position":
      return tableOf(world, league, source.level).filter(
        (row) => row.position >= source.from && row.position <= source.to,
      );
    case "champion":
    case "runnerUp": {
      if (cup) {
        const result = cupChampion(cup);
        const clubId = source.kind === "champion" ? result?.championId : result?.runnerUpId;
        return clubId ? [{ clubId }] : [];
      }
      const row = tableOf(world, league, 1)[source.kind === "champion" ? 0 : 1];
      return row ? [{ clubId: row.clubId, position: row.position }] : [];
    }
    case "reached": {
      if (!cup) return [];
      const reached = cupReached(cup);
      // `cupReached`: 0 = jogou a 1ª fase; `phases.length` = campeão. A fase 1 do dado é o índice 0.
      return Object.entries(reached)
        .filter(([, index]) => index >= source.phase - 1)
        .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : a > b ? 1 : 0))
        .map(([clubId]) => ({ clubId }));
    }
  }
}
