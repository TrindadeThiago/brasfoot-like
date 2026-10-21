import type { Lineup } from "../match/types";
import type { CompletedBank } from "../model/types";
import { type SeasonError, seasonError } from "../season/errors";
import { completeRound, finishRound, type LiveRound, startRound } from "../season/live-round";
import { isSeasonOver } from "../season/season";
import type { Season, SeasonStep } from "../season/types";
import { isLeagueSeasonOver, leagueRound } from "./league";
import type { LeagueResult, LeagueSeason } from "./types";

/** Divisões que disputam a rodada atual da liga. */
function playing(league: LeagueSeason): Season[] {
  const round = leagueRound(league);
  return league.divisions.filter((season) => !isSeasonOver(season) && season.nextRound === round);
}

/**
 * Prepara a rodada atual de todas as divisões numa única LiveRound (research.md R2); cada
 * partida traz `divisionLevel`. `lineups` vale para clubes de qualquer divisão.
 */
export function startLeagueRound(
  league: LeagueSeason,
  world: CompletedBank,
  lineups?: Record<string, Lineup>,
): { ok: true; round: LiveRound } | { ok: false; error: SeasonError } {
  if (isLeagueSeasonOver(league)) throw new Error("temporada encerrada");
  const number = leagueRound(league);
  const divisions = playing(league);
  if (lineups) {
    const clubs = new Set(
      divisions.flatMap((season) =>
        (season.calendar[number - 1]?.fixtures ?? []).flatMap((fixture) => [
          fixture.home,
          fixture.away,
        ]),
      ),
    );
    for (const clubId of Object.keys(lineups)) {
      if (!clubs.has(clubId)) {
        return {
          ok: false,
          error: seasonError("season.lineup_not_playing", { clubId, round: number }),
        };
      }
    }
  }
  const round: LiveRound = {
    round: number,
    competitionId: league.competitionId,
    tick: 0,
    matches: [],
    decisions: [],
  };
  for (const season of divisions) {
    const own = lineups
      ? Object.fromEntries(
          Object.entries(lineups).filter(([clubId]) => season.clubIds.includes(clubId)),
        )
      : undefined;
    const started = startRound(season, world, own);
    if (!started.ok) return started;
    round.matches.push(...started.round.matches);
  }
  return { ok: true, round };
}

/** Fecha a rodada em cada divisão (completeRound por divisão) e devolve a liga avançada. */
export function completeLeagueRound(
  league: LeagueSeason,
  world: CompletedBank,
  round: LiveRound,
): LeagueResult {
  if (round.round !== leagueRound(league))
    throw new Error("rodada de outra temporada ou já fechada");
  const divisions: Season[] = [];
  for (const season of league.divisions) {
    const matches = round.matches.filter((match) => match.divisionLevel === season.divisionLevel);
    if (matches.length === 0) {
      if (!isSeasonOver(season) && season.nextRound === round.round) {
        throw new Error(`rodada sem as partidas da divisão ${season.divisionLevel}`);
      }
      divisions.push(season);
      continue;
    }
    const completed = completeRound(season, world, { ...round, matches });
    if (!completed.ok) return completed;
    divisions.push(completed.season);
  }
  return { ok: true, league: { ...league, divisions } };
}

/** Equivalente de advanceSeason para a liga: N rodadas ou até o fim, pelo caminho do ao vivo. */
export function advanceLeague(
  league: LeagueSeason,
  world: CompletedBank,
  step: SeasonStep,
  lineups?: Record<string, Lineup>,
): LeagueResult {
  let next = league;
  const total =
    "toEnd" in step
      ? Math.max(...league.divisions.map((season) => season.calendar.length))
      : step.rounds;
  for (let played = 0; played < total && !isLeagueSeasonOver(next); played++) {
    const started = startLeagueRound(next, world, played === 0 ? lineups : undefined);
    if (!started.ok) return started;
    const completed = completeLeagueRound(next, world, finishRound(started.round));
    if (!completed.ok) return completed;
    next = completed.league;
  }
  return { ok: true, league: next };
}
