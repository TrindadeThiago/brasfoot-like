import type { CompletedBank } from "../model/types";
import { seasonError } from "../season/errors";
import { createSeason, isSeasonOver } from "../season/season";
import type { PlayerStatus, Season } from "../season/types";
import type { DivisionZones, LeagueResult, LeagueSeason, LeagueSeasonOptions } from "./types";

/** Seed da temporada `number` de uma carreira (research.md R3). */
export function leagueSeasonSeed(careerSeed: string, number: number): string {
  return number === 1 ? careerSeed : `${careerSeed}:s${number}`;
}

/** Ano da data de referência do banco. */
function referenceYear(world: CompletedBank): number {
  return Number(world.manifest.referenceDate.slice(0, 4));
}

/** Motivo pelo qual a composição não reparte os clubes da competição como no banco. */
function compositionProblem(
  divisions: readonly { level: number; clubIds: readonly string[] }[],
  composition: Record<number, readonly string[]>,
): { level: number; reason: string } | undefined {
  const seen = new Set<string>();
  const competing = new Set(divisions.flatMap((division) => division.clubIds));
  for (const division of divisions) {
    const clubIds = composition[division.level];
    if (!clubIds) return { level: division.level, reason: "nível sem clubes" };
    if (clubIds.length !== division.clubIds.length) {
      return {
        level: division.level,
        reason: `${clubIds.length} clubes em vez de ${division.clubIds.length}`,
      };
    }
    for (const clubId of clubIds) {
      if (!competing.has(clubId)) {
        return { level: division.level, reason: `clube fora da competição: ${clubId}` };
      }
      if (seen.has(clubId)) return { level: division.level, reason: `clube repetido: ${clubId}` };
      seen.add(clubId);
    }
  }
  const extra = Object.keys(composition)
    .map(Number)
    .find((level) => !divisions.some((division) => division.level === level));
  if (extra !== undefined) return { level: extra, reason: "nível inexistente" };
  return undefined;
}

/** Situação dos jogadores dos clubes informados (cada divisão guarda só os seus). */
function statusOf(
  world: CompletedBank,
  clubIds: readonly string[],
  status: Record<string, PlayerStatus> | undefined,
): Record<string, PlayerStatus> | undefined {
  if (!status) return undefined;
  const clubs = new Set(clubIds);
  const own = new Set(
    world.players.filter((player) => clubs.has(player.clubId)).map((player) => player.id),
  );
  return Object.fromEntries(Object.entries(status).filter(([playerId]) => own.has(playerId)));
}

/** Uma Season por divisão da competição, todas com a seed da temporada (contracts/league-api.md). */
export function createLeagueSeason(
  world: CompletedBank,
  options: LeagueSeasonOptions,
): LeagueResult {
  const competition = world.competitions.find((entry) => entry.id === options.competitionId);
  if (!competition) {
    return {
      ok: false,
      error: seasonError("season.unknown_competition", { competitionId: options.competitionId }),
    };
  }
  const levels = [...competition.divisions].sort((a, b) => a.level - b.level);
  if (options.composition) {
    const problem = compositionProblem(levels, options.composition);
    if (problem) return { ok: false, error: seasonError("season.invalid_composition", problem) };
  }
  const number = options.number ?? 1;
  const seed = leagueSeasonSeed(options.careerSeed, number);
  const divisions: Season[] = [];
  for (const division of levels) {
    const clubIds = options.composition?.[division.level];
    const status = statusOf(world, clubIds ?? division.clubIds, options.status);
    const created = createSeason(world, {
      competitionId: competition.id,
      divisionLevel: division.level,
      seed,
      ...(options.rules ? { rules: options.rules } : {}),
      ...(clubIds ? { clubIds } : {}),
      ...(status ? { status } : {}),
    });
    if (!created.ok) return created;
    divisions.push(created.season);
  }
  return {
    ok: true,
    league: {
      competitionId: competition.id,
      number,
      year: options.year ?? referenceYear(world),
      seed,
      divisions,
    },
  };
}

export function isLeagueSeasonOver(league: LeagueSeason): boolean {
  return league.divisions.every(isSeasonOver);
}

/** Rodada atual da liga (1..R), ou R + 1 se encerrada. */
export function leagueRound(league: LeagueSeason): number {
  const active = league.divisions.filter((season) => !isSeasonOver(season));
  if (active.length > 0) return Math.min(...active.map((season) => season.nextRound));
  return Math.max(...league.divisions.map((season) => season.nextRound));
}

/** Número de rodadas da temporada da liga (o da divisão mais longa). */
export function leagueTotalRounds(league: LeagueSeason): number {
  return Math.max(...league.divisions.map((season) => season.calendar.length));
}

export function divisionSeason(league: LeagueSeason, level: number): Season | undefined {
  return league.divisions.find((season) => season.divisionLevel === level);
}

export function clubDivision(league: LeagueSeason, clubId: string): Season | undefined {
  return league.divisions.find((season) => season.clubIds.includes(clubId));
}

/** Vagas de acesso/rebaixamento da divisão, para marcar a classificação (FR-006). */
export function divisionZones(
  world: CompletedBank,
  competitionId: string,
  level: number,
): DivisionZones {
  const division = world.competitions
    .find((entry) => entry.id === competitionId)
    ?.divisions.find((entry) => entry.level === level);
  return {
    level,
    promotion: division?.promotionSlots ?? 0,
    relegation: division?.relegationSlots ?? 0,
  };
}
