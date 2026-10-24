import { playerLines } from "./record";
import type { PlayerSeasonStats, Season } from "./types";

/** Estatísticas de cada jogador na temporada, derivadas dos registros (FR-021). */
export function seasonStats(season: Season): PlayerSeasonStats[] {
  const rows = new Map<string, PlayerSeasonStats>();
  const row = (playerId: string, clubId: string) => {
    let current = rows.get(playerId);
    if (!current) {
      current = {
        playerId,
        clubId,
        matches: 0,
        minutes: 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        reds: 0,
        matchesSuspended: 0,
        matchesInjured: 0,
      };
      rows.set(playerId, current);
    }
    return current;
  };
  for (const record of season.records) {
    for (const [playerId, line] of Object.entries(playerLines(record))) {
      const current = row(playerId, line.side === "home" ? record.home : record.away);
      current.matches += 1;
      current.minutes += line.minutes;
      current.goals += line.goals;
      current.assists += line.assists;
      current.yellows += line.yellows;
      if (line.red) current.reds += 1;
    }
    for (const side of ["home", "away"] as const) {
      const clubId = side === "home" ? record.home : record.away;
      for (const absence of record.unavailable[side]) {
        const current = row(absence.playerId, clubId);
        if (absence.reason === "suspension") current.matchesSuspended += 1;
        else current.matchesInjured += 1;
      }
    }
  }
  return [...rows.values()].sort((a, b) => a.playerId.localeCompare(b.playerId));
}

function ranking(season: Season, key: "goals" | "assists", limit: number): PlayerSeasonStats[] {
  return seasonStats(season)
    .filter((row) => row[key] > 0)
    .sort(
      (a, b) => b[key] - a[key] || a.matches - b.matches || a.playerId.localeCompare(b.playerId),
    )
    .slice(0, limit);
}

/** Artilharia: gols; desempate por menos partidas e depois pelo id (FR-022). */
export function topScorers(season: Season, limit = 10): PlayerSeasonStats[] {
  return ranking(season, "goals", limit);
}

export function topAssists(season: Season, limit = 10): PlayerSeasonStats[] {
  return ranking(season, "assists", limit);
}
