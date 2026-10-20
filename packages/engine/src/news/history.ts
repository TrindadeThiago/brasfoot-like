import type { SeasonHistoryEntry } from "../career/types";
import type { CompletedBank } from "../model/types";
import type { PlayerSeasonStats } from "../season/types";
import type { AllTime, Legend, NewsState } from "./types";

function byId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Soma as estatísticas da temporada aos acumulados (gols e jogos por jogador e clube). */
export function accumulate(
  allTime: AllTime,
  stats: readonly PlayerSeasonStats[],
  world: CompletedBank,
): AllTime {
  const players = JSON.parse(JSON.stringify(allTime.players)) as AllTime["players"];
  const names = new Map(world.players.map((player) => [player.id, player.displayName]));
  for (const line of [...stats].sort((a, b) => byId(a.playerId, b.playerId))) {
    if (line.matches === 0 && line.goals === 0) continue;
    const totals = players[line.playerId] ?? {
      name: names.get(line.playerId) ?? line.playerId,
      goals: 0,
      matches: 0,
      clubs: {},
    };
    totals.goals += line.goals;
    totals.matches += line.matches;
    const club = totals.clubs[line.clubId] ?? { goals: 0, matches: 0 };
    club.goals += line.goals;
    club.matches += line.matches;
    totals.clubs[line.clubId] = club;
    players[line.playerId] = totals;
  }
  return { players };
}

/** Lendas do clube: mais gols e mais jogos pelo clube (desempate por id). */
export function clubLegends(
  news: Pick<NewsState, "allTime">,
  clubId: string,
  limit: number,
): { byGoals: Legend[]; byMatches: Legend[] } {
  const rows: Legend[] = Object.entries(news.allTime.players)
    .filter(([, totals]) => totals.clubs[clubId])
    .map(([playerId, totals]) => ({
      playerId,
      name: totals.name,
      goals: totals.clubs[clubId]?.goals ?? 0,
      matches: totals.clubs[clubId]?.matches ?? 0,
    }));
  const byGoals = [...rows]
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.matches - a.matches || byId(a.playerId, b.playerId))
    .slice(0, limit);
  const byMatches = [...rows]
    .sort((a, b) => b.matches - a.matches || b.goals - a.goals || byId(a.playerId, b.playerId))
    .slice(0, limit);
  return { byGoals, byMatches };
}

/** Artilheiros históricos da liga (aposentados incluídos). */
export function allTimeScorers(news: Pick<NewsState, "allTime">, limit: number): Legend[] {
  return Object.entries(news.allTime.players)
    .map(([playerId, totals]) => ({
      playerId,
      name: totals.name,
      goals: totals.goals,
      matches: totals.matches,
    }))
    .filter((row) => row.goals > 0)
    .sort((a, b) => b.goals - a.goals || a.matches - b.matches || byId(a.playerId, b.playerId))
    .slice(0, limit);
}

/**
 * Poda dos acumulados (research.md R8): ficam os jogadores ainda no banco, os `top` artilheiros
 * da liga e os `legends` com mais gols ou mais jogos de algum clube.
 */
export function pruneAllTime(
  allTime: AllTime,
  world: CompletedBank,
  top: number,
  legends: number,
): AllTime {
  const keep = new Set(world.players.map((player) => player.id));
  for (const row of allTimeScorers({ allTime }, top)) keep.add(row.playerId);
  const clubIds = new Set(
    Object.values(allTime.players).flatMap((totals) => Object.keys(totals.clubs)),
  );
  for (const clubId of [...clubIds].sort()) {
    const { byGoals, byMatches } = clubLegends({ allTime }, clubId, legends);
    for (const row of [...byGoals, ...byMatches]) keep.add(row.playerId);
  }
  return {
    players: Object.fromEntries(
      Object.entries(allTime.players).filter(([playerId]) => keep.has(playerId)),
    ),
  };
}

/** Títulos por clube e divisão, a partir do histórico de temporadas (já guardado). */
export function titlesByClub(
  history: readonly SeasonHistoryEntry[],
): { clubId: string; level: number; titles: number; years: number[] }[] {
  const map = new Map<string, { clubId: string; level: number; titles: number; years: number[] }>();
  for (const entry of history) {
    for (const division of entry.divisions) {
      const key = `${division.level}:${division.championId}`;
      const row = map.get(key) ?? {
        clubId: division.championId,
        level: division.level,
        titles: 0,
        years: [],
      };
      row.titles += 1;
      row.years.push(entry.year);
      map.set(key, row);
    }
  }
  return [...map.values()].sort(
    (a, b) => a.level - b.level || b.titles - a.titles || byId(a.clubId, b.clubId),
  );
}
