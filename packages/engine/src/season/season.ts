import { simulateMatch } from "../match/engine.js";
import type { Lineup, MatchInput, Side } from "../match/types.js";
import type { CompletedBank, CompletedPlayer } from "../model/types.js";
import { generateCalendar } from "./calendar.js";
import { applyMatchToStatus } from "./discipline.js";
import { type SeasonError, seasonError } from "./errors.js";
import { lineupForMatch, preferredFormation } from "./lineups.js";
import { toMatchRecord } from "./record.js";
import {
  type Absence,
  DEFAULT_DISCIPLINE_RULES,
  type DisciplineRules,
  type Fixture,
  type MatchRecord,
  type PlayerStatus,
  type Season,
  type SeasonOptions,
  type SeasonStep,
  type SeasonWarning,
} from "./types.js";

export type CreateSeasonResult = { ok: true; season: Season } | { ok: false; error: SeasonError };
export type AdvanceSeasonResult = { ok: true; season: Season } | { ok: false; error: SeasonError };

const RULE_RANGES: Record<keyof DisciplineRules, readonly [number, number]> = {
  yellowsForSuspension: [1, 10],
  matchesPerRed: [1, 10],
};

function squadsByClub(world: CompletedBank): Map<string, CompletedPlayer[]> {
  const squads = new Map<string, CompletedPlayer[]>();
  for (const player of world.players) {
    const squad = squads.get(player.clubId);
    if (squad) squad.push(player);
    else squads.set(player.clubId, [player]);
  }
  return squads;
}

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
  if (division.clubIds.length < 2) {
    return {
      ok: false,
      error: seasonError("season.too_few_clubs", { count: division.clubIds.length }),
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
  for (const clubId of division.clubIds) {
    formations[clubId] = preferredFormation(squads.get(clubId) ?? []);
  }
  return {
    ok: true,
    season: {
      competitionId: competition.id,
      divisionLevel: division.level,
      seed: options.seed,
      rules,
      clubIds: [...division.clubIds],
      formations,
      calendar: generateCalendar(division.clubIds, competition.format.rounds, options.seed),
      nextRound: 1,
      records: [],
      status: {},
      warnings: [],
    },
  };
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

interface SideLineup {
  lineup: Lineup;
  absences: Absence[];
  unavailable: string[];
  warning?: SeasonWarning;
}

function sideLineup(
  season: Season,
  round: number,
  clubId: string,
  squad: CompletedPlayer[],
  status: Record<string, PlayerStatus>,
  external: Lineup | undefined,
): { ok: true; value: SideLineup } | { ok: false; error: SeasonError } {
  const blocked = squad
    .filter((player) => isUnavailable(status[player.id]))
    .map((player) => {
      const entry = status[player.id] as PlayerStatus;
      return {
        playerId: player.id,
        reason: entry.injury > 0 ? ("injury" as const) : ("suspension" as const),
        remaining: Math.max(entry.injury, entry.suspension),
      };
    });

  if (external) {
    const chosen = new Set([...Object.values(external.starters), ...external.bench]);
    const conflict = blocked.find((entry) => chosen.has(entry.playerId));
    if (conflict) {
      return {
        ok: false,
        error: seasonError("season.lineup_unavailable", { clubId, playerId: conflict.playerId }),
      };
    }
    return {
      ok: true,
      value: {
        lineup: external,
        absences: blocked.map(({ playerId, reason }) => ({ playerId, reason, fielded: false })),
        unavailable: blocked.map((entry) => entry.playerId),
      },
    };
  }

  const formation = season.formations[clubId] ?? "4-4-2";
  const { lineup, fielded } = lineupForMatch(squad, formation, blocked);
  const fieldedSet = new Set(fielded);
  const value: SideLineup = {
    lineup,
    absences: blocked.map(({ playerId, reason }) => ({
      playerId,
      reason,
      fielded: fieldedSet.has(playerId),
    })),
    unavailable: blocked
      .filter((entry) => !fieldedSet.has(entry.playerId))
      .map((entry) => entry.playerId),
  };
  if (fielded.length > 0)
    value.warning = { round, clubId, code: "short_squad", playerIds: fielded };
  return { ok: true, value };
}

function playFixture(
  season: Season,
  fixture: Fixture,
  squads: Map<string, CompletedPlayer[]>,
  status: Record<string, PlayerStatus>,
  lineups: Record<string, Lineup> | undefined,
):
  | { ok: true; record: MatchRecord; warnings: SeasonWarning[] }
  | { ok: false; error: SeasonError } {
  const sides: Record<Side, string> = { home: fixture.home, away: fixture.away };
  const prepared: Partial<Record<Side, SideLineup>> = {};
  for (const side of ["home", "away"] as const) {
    const clubId = sides[side];
    const result = sideLineup(
      season,
      fixture.round,
      clubId,
      squads.get(clubId) ?? [],
      status,
      lineups?.[clubId],
    );
    if (!result.ok) return result;
    prepared[side] = result.value;
  }
  const home = prepared.home as SideLineup;
  const away = prepared.away as SideLineup;
  const input: MatchInput = {
    home: {
      clubId: fixture.home,
      squad: squads.get(fixture.home) ?? [],
      lineup: home.lineup,
      unavailable: home.unavailable,
    },
    away: {
      clubId: fixture.away,
      squad: squads.get(fixture.away) ?? [],
      lineup: away.lineup,
      unavailable: away.unavailable,
    },
    seed: fixture.seed,
  };
  const outcome = simulateMatch(input);
  if (!outcome.ok) {
    const failed = outcome.errors[0];
    const clubId = failed?.side ? sides[failed.side] : fixture.home;
    if (lineups?.[clubId]) {
      return {
        ok: false,
        error: seasonError("season.invalid_lineup", {
          clubId,
          matchErrorCode: failed?.code ?? "unknown",
        }),
      };
    }
    throw new Error(`escalação automática inválida: ${JSON.stringify(outcome.errors)}`);
  }
  const playerSides: Record<string, Side> = {};
  for (const player of input.home.squad) playerSides[player.id] = "home";
  for (const player of input.away.squad) playerSides[player.id] = "away";
  const record = toMatchRecord(
    fixture.round,
    fixture.home,
    fixture.away,
    outcome.result,
    playerSides,
    {
      home: home.absences,
      away: away.absences,
    },
  );
  const warnings = [home.warning, away.warning].filter(
    (warning): warning is SeasonWarning => warning !== undefined,
  );
  return { ok: true, record, warnings };
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

  const squads = squadsByClub(world);
  const next: Season = {
    ...season,
    records: [...season.records],
    status: Object.fromEntries(
      Object.entries(season.status).map(([id, entry]) => [id, { ...entry }]),
    ),
    warnings: [...season.warnings],
  };
  const total = "toEnd" in step ? season.calendar.length : step.rounds;
  for (let played = 0; played < total && !isSeasonOver(next); played++) {
    const round = next.calendar[next.nextRound - 1];
    if (!round) break;
    const roundLineups = played === 0 ? lineups : undefined;
    const results: { record: MatchRecord; warnings: SeasonWarning[] }[] = [];
    for (const fixture of round.fixtures) {
      const outcome = playFixture(next, fixture, squads, next.status, roundLineups);
      if (!outcome.ok) return outcome;
      results.push(outcome);
    }
    for (const { record, warnings } of results) {
      next.records.push(record);
      next.warnings.push(...warnings);
      applyMatchToStatus(next.status, record, "home", next.rules, next.seed);
      applyMatchToStatus(next.status, record, "away", next.rules, next.seed);
    }
    next.nextRound += 1;
  }
  return { ok: true, season: next };
}
