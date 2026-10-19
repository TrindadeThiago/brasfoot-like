import type { Lineup } from "../match/types";
import type { CompletedBank, Division } from "../model/types";
import { generateCalendar } from "./calendar";
import { type SeasonError, seasonError } from "./errors";
import { squadsByClub } from "./fixture";
import { preferredFormation } from "./lineups";
import { completeRound, finishRound, startRound } from "./live-round";
import {
  DEFAULT_DISCIPLINE_RULES,
  type DisciplineRules,
  type PlayerStatus,
  type Season,
  type SeasonOptions,
  type SeasonStep,
} from "./types";

export type CreateSeasonResult = { ok: true; season: Season } | { ok: false; error: SeasonError };
export type AdvanceSeasonResult = { ok: true; season: Season } | { ok: false; error: SeasonError };

const RULE_RANGES: Record<keyof DisciplineRules, readonly [number, number]> = {
  yellowsForSuspension: [1, 10],
  matchesPerRed: [1, 10],
};

/** Cria a temporada de uma divisão de pontos corridos (FR-001 a FR-007, FR-023). */
export function createSeason(world: CompletedBank, options: SeasonOptions): CreateSeasonResult {
  const competition = world.competitions.find((entry) => entry.id === options.competitionId);
  if (!competition) {
    return {
      ok: false,
      error: seasonError("season.unknown_competition", { competitionId: options.competitionId }),
    };
  }
  const division = competition.divisions.find((entry) => entry.level === options.divisionLevel);
  if (!division) {
    return {
      ok: false,
      error: seasonError("season.unknown_division", {
        competitionId: options.competitionId,
        level: options.divisionLevel,
      }),
    };
  }
  if (competition.format.type !== "league") {
    return {
      ok: false,
      error: seasonError("season.unsupported_format", { format: competition.format.type }),
    };
  }
  const clubIds = options.clubIds ? [...options.clubIds] : [...division.clubIds];
  if (options.clubIds) {
    const reason = compositionProblem(world, competition.divisions, clubIds);
    if (reason) {
      return {
        ok: false,
        error: seasonError("season.invalid_composition", { level: division.level, reason }),
      };
    }
  }
  if (clubIds.length < 2) {
    return {
      ok: false,
      error: seasonError("season.too_few_clubs", { count: clubIds.length }),
    };
  }
  const rules: DisciplineRules = { ...DEFAULT_DISCIPLINE_RULES, ...options.rules };
  for (const [rule, [min, max]] of Object.entries(RULE_RANGES)) {
    const value = rules[rule as keyof DisciplineRules];
    if (!Number.isInteger(value) || value < min || value > max) {
      return { ok: false, error: seasonError("season.invalid_rules", { rule, value, min, max }) };
    }
  }

  const squads = squadsByClub(world);
  const formations: Season["formations"] = {};
  for (const clubId of clubIds) {
    formations[clubId] = preferredFormation(squads.get(clubId) ?? []);
  }
  return {
    ok: true,
    season: {
      competitionId: competition.id,
      divisionLevel: division.level,
      seed: options.seed,
      rules,
      clubIds,
      formations,
      calendar: generateCalendar(clubIds, competition.format.rounds, options.seed),
      nextRound: 1,
      records: [],
      status: Object.fromEntries(
        Object.entries(options.status ?? {}).map(([id, entry]) => [id, { ...entry }]),
      ),
      warnings: [],
    },
  };
}

/** Motivo pelo qual uma composição informada é inválida, ou nada se for válida. */
function compositionProblem(
  world: CompletedBank,
  divisions: readonly Division[],
  clubIds: readonly string[],
): string | undefined {
  if (clubIds.length < 2) return "menos de 2 clubes";
  if (new Set(clubIds).size !== clubIds.length) return "clube repetido";
  const known = new Set(world.clubs.map((club) => club.id));
  const unknown = clubIds.find((clubId) => !known.has(clubId));
  if (unknown) return `clube inexistente: ${unknown}`;
  const competing = new Set(divisions.flatMap((division) => division.clubIds));
  const outsider = clubIds.find((clubId) => !competing.has(clubId));
  if (outsider) return `clube fora da competição: ${outsider}`;
  return undefined;
}

export function isSeasonOver(season: Season): boolean {
  return season.nextRound > season.calendar.length;
}

function isUnavailable(status: PlayerStatus | undefined): boolean {
  return status !== undefined && (status.suspension > 0 || status.injury > 0);
}

/** Jogadores do clube suspensos ou lesionados neste momento. */
export function unavailablePlayers(
  season: Season,
  clubId: string,
  world?: CompletedBank,
): string[] {
  const ids = world
    ? world.players.filter((player) => player.clubId === clubId).map((player) => player.id)
    : Object.keys(season.status);
  return ids.filter((playerId) => isUnavailable(season.status[playerId])).sort();
}

/**
 * Avança a temporada N rodadas ou até o fim (FR-005, FR-006). `lineups` (escalação externa por
 * clube) vale só para a próxima rodada (FR-008). Nunca altera a temporada recebida.
 */
export function advanceSeason(
  season: Season,
  world: CompletedBank,
  step: SeasonStep,
  lineups?: Record<string, Lineup>,
): AdvanceSeasonResult {
  if (isSeasonOver(season)) return { ok: true, season };
  const firstRound = season.calendar[season.nextRound - 1];
  if (lineups && firstRound) {
    const playing = new Set(firstRound.fixtures.flatMap((fixture) => [fixture.home, fixture.away]));
    for (const clubId of Object.keys(lineups)) {
      if (!playing.has(clubId)) {
        return {
          ok: false,
          error: seasonError("season.lineup_not_playing", { clubId, round: firstRound.number }),
        };
      }
    }
  }

  let next = season;
  const total = "toEnd" in step ? season.calendar.length : step.rounds;
  for (let played = 0; played < total && !isSeasonOver(next); played++) {
    const started = startRound(next, world, played === 0 ? lineups : undefined);
    if (!started.ok) return started;
    const completed = completeRound(next, world, finishRound(started.round));
    if (!completed.ok) return completed;
    next = completed.season;
  }
  return { ok: true, season: next };
}
