import type { StandingRow } from "../season/types";
import type { CompositionChange } from "./composition";
import type { HistoryRow, LeagueSeason, SeasonHistoryEntry } from "./types";

function historyRow(row: StandingRow): HistoryRow {
  const { position, clubId, points, played, wins, draws, losses, goalsFor, goalsAgainst } = row;
  return { position, clubId, points, played, wins, draws, losses, goalsFor, goalsAgainst };
}

/** Entrada de histórico de uma temporada encerrada (research.md R8). */
export function historyEntry(
  league: LeagueSeason,
  finalStandings: Readonly<Record<number, StandingRow[]>>,
  moves: CompositionChange,
): SeasonHistoryEntry {
  return {
    number: league.number,
    year: league.year,
    competitionId: league.competitionId,
    divisions: [...league.divisions]
      .sort((a, b) => a.divisionLevel - b.divisionLevel)
      .map((season) => {
        const level = season.divisionLevel;
        const table = finalStandings[level] ?? [];
        return {
          level,
          championId: table[0]?.clubId ?? "",
          standings: table.map(historyRow),
          promoted: [...(moves.promoted[level] ?? [])],
          relegated: [...(moves.relegated[level] ?? [])],
        };
      }),
  };
}
