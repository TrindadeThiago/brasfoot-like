import type { BoardState } from "../board/types";
import { addDays, seasonDate } from "../calendar/date";
import { roundDates, scheduleOf } from "../calendar/schedule";
import {
  buildSeasonCalendar,
  type CalendarCompetition,
  type CalendarDay,
  dayIndexAfter,
  gapsOf,
  SEASON_DAYS,
  type SeasonCalendar,
} from "../calendar/season-calendar";
import type { FansState } from "../fans/types";
import type { FinanceState } from "../finance/types";
import type { FitnessState } from "../fitness/types";
import { createCupSeason, drawReady } from "../knockout/bracket";
import type { SeasonUnavailability } from "../lineup/types";
import { clubUnavailability } from "../lineup/unavailability";
import type { MarketState } from "../market/types";
import type { Competition, CompletedBank } from "../model/types";
import type { NewsState } from "../news/types";
import type { RenewalState } from "../renewal/types";
import type { SeasonError } from "../season/errors";
import type { Fixture, MatchRecord, PlayerStatus } from "../season/types";
import type { FixtureStage } from "../stages/types";
import { mainCompetitionOf } from "../world/countries";
import { availabilitySeason } from "./injuries";
import {
  clubDivision,
  createLeagueSeason,
  leagueRound,
  leagueSeasonSeed,
  leagueTotalRounds,
} from "./league";
import type { LeagueSeason } from "./types";

/**
 * Temporada da carreira por datas (017): a competição principal (`league`, dona da economia,
 * diretoria, torcida e histórico), as secundárias, o calendário e a condição física, junto do mundo
 * e dos sistemas que a rodada atualiza.
 */
export interface CareerSeasonState {
  league: LeagueSeason;
  /** Competições secundárias, na ordem de `competitions.json` (vazio no banco padrão). */
  competitions: LeagueSeason[];
  calendar: SeasonCalendar;
  fitness: FitnessState;
  finances: FinanceState;
  world: CompletedBank;
  renewal?: RenewalState;
  market?: MarketState;
  board?: BoardState;
  fans?: FansState;
  news?: NewsState;
}

/**
 * Calendário só da competição principal, com a agenda dela (017 R12): um dia por rodada, e
 * `next` no dia da próxima rodada a disputar. Serve a carreiras sem outras competições e à
 * migração de saves antigos.
 */
export function leagueCalendar(world: CompletedBank, league: LeagueSeason): SeasonCalendar {
  const start = seasonDate(world.manifest.referenceDate, league.year);
  const dates = roundDates(
    scheduleOf(world, league.competitionId),
    start,
    leagueTotalRounds(league),
  );
  const days = dates.map((date, index) => ({
    date,
    slots: [{ competitionId: league.competitionId, round: index + 1 }],
  }));
  return { start, end: addDays(start, SEASON_DAYS - 1), days };
}

/** Rodadas já fechadas de cada competição da carreira. */
function roundsDone(
  state: Pick<CareerSeasonState, "league" | "competitions">,
): Record<string, number> {
  const done: Record<string, number> = {};
  for (const season of [state.league, ...state.competitions]) {
    done[season.competitionId] = leagueRound(season) - 1;
  }
  return done;
}

/** Índice do próximo dia a disputar; `days.length` = temporada encerrada. */
export function calendarNext(
  state: Pick<CareerSeasonState, "league" | "competitions" | "calendar">,
): number {
  return dayIndexAfter(state.calendar, roundsDone(state));
}

/** Próximo dia a disputar; undefined com a temporada encerrada. */
export function currentDay(
  state: Pick<CareerSeasonState, "league" | "competitions" | "calendar">,
): CalendarDay | undefined {
  return state.calendar.days[calendarNext(state)];
}

/** Todas as rodadas de todas as competições foram disputadas. */
export function isCalendarOver(
  state: Pick<CareerSeasonState, "league" | "competitions" | "calendar">,
): boolean {
  return calendarNext(state) >= state.calendar.days.length;
}

export interface CareerSeasonOptions {
  careerSeed: string;
  /** Padrão 1. */
  number?: number;
  /** Padrão: ano de `manifest.referenceDate`. */
  year?: number;
  /** Composição por nível de cada competição (id → nível → clubes); padrão: a do banco. */
  compositions?: Record<string, Record<number, readonly string[]>>;
  /** Situação inicial dos jogadores por competição (lesões herdadas e cartões). */
  statuses?: Record<string, Record<string, PlayerStatus>>;
  /**
   * Liga em foco (020 R2): a principal do país deste clube. Padrão: a primeira competição do banco.
   * `leagueCompetitionId` vence quando informada (a virada mantém a mesma liga em foco).
   */
  focusClubId?: string;
  leagueCompetitionId?: string;
}

/** A parte da temporada da carreira que depende só do banco: competições, calendário e condição. */
export type CareerSeasonSet = Pick<
  CareerSeasonState,
  "league" | "competitions" | "calendar" | "fitness"
>;

export type CareerSeasonResult =
  | ({ ok: true } & CareerSeasonSet)
  | { ok: false; error: SeasonError };

/** Índice da liga em foco entre as temporadas criadas (020 R2). */
function focusIndex(
  world: CompletedBank,
  created: readonly LeagueSeason[],
  options: Pick<CareerSeasonOptions, "focusClubId" | "leagueCompetitionId">,
): number {
  const byId = options.leagueCompetitionId;
  if (byId !== undefined) {
    const index = created.findIndex((entry) => entry.competitionId === byId);
    if (index >= 0) return index;
  }
  const club = world.clubs.find((entry) => entry.id === options.focusClubId);
  const main = club ? mainCompetitionOf(world, club.countryId) : undefined;
  const index = created.findIndex((entry) => entry.competitionId === main?.id);
  return index >= 0 ? index : 0;
}

/**
 * Cria a temporada de todas as competições do banco (017 R4): a primeira do banco com a seed de
 * sempre, as demais com a seed `${careerSeed}:${competitionId}`, e o calendário por datas. A liga em
 * foco (`league`) é a principal do país do clube em foco (020 R2); as outras competições, inclusive
 * as principais dos demais países, ficam em `competitions`.
 * O banco já foi validado, então um calendário impossível aqui é erro de programação.
 */
export function createCareerSeason(
  world: CompletedBank,
  options: CareerSeasonOptions,
): CareerSeasonResult {
  const created: LeagueSeason[] = [];
  for (const [position, competition] of world.competitions.entries()) {
    if (competition.format.type === "knockout") {
      const number = options.number ?? 1;
      const careerSeed = `${options.careerSeed}:${competition.id}`;
      const seed = leagueSeasonSeed(careerSeed, number);
      const cup = createCupSeason(world, {
        competitionId: competition.id,
        seed,
        ...(options.statuses?.[competition.id] ? { status: options.statuses[competition.id] } : {}),
      });
      if (!cup.ok) return cup;
      created.push({
        competitionId: competition.id,
        number,
        year: options.year ?? Number(world.manifest.referenceDate.slice(0, 4)),
        seed,
        divisions: [drawReady(cup.season, world)],
      });
      continue;
    }
    const result = createLeagueSeason(world, {
      competitionId: competition.id,
      careerSeed: position === 0 ? options.careerSeed : `${options.careerSeed}:${competition.id}`,
      ...(options.number !== undefined ? { number: options.number } : {}),
      ...(options.year !== undefined ? { year: options.year } : {}),
      ...(options.compositions?.[competition.id]
        ? { composition: options.compositions[competition.id] as Record<number, string[]> }
        : {}),
      ...(options.statuses?.[competition.id] ? { status: options.statuses[competition.id] } : {}),
    });
    if (!result.ok) return result;
    created.push(result.league);
  }
  // Primeira temporada: os participantes das competições com vagas vêm do banco (021 R6).
  for (const [index, season] of created.entries()) {
    const competition = world.competitions.find((entry) => entry.id === season.competitionId);
    if (!competition?.divisions.some((division) => (division.berths?.length ?? 0) > 0)) continue;
    if (season.origins) continue;
    created[index] = {
      ...season,
      origins: Object.fromEntries(
        season.divisions.flatMap((division) =>
          division.clubIds.map((clubId) => [clubId, { kind: "bank" as const }]),
        ),
      ),
    };
  }
  const focus = focusIndex(world, created, options);
  const league = created[focus];
  if (!league) throw new Error("banco sem competições");
  const competitions = created.filter((_, index) => index !== focus);
  const inputs: CalendarCompetition[] = created.map((season) => ({
    competitionId: season.competitionId,
    rounds: leagueTotalRounds(season),
    clubIds: [...new Set(season.divisions.flatMap((division) => division.clubIds))].sort(),
    schedule: scheduleOf(world, season.competitionId),
    ...gapsOf(world.competitions.find((entry) => entry.id === season.competitionId) as Competition),
  }));
  const start = seasonDate(world.manifest.referenceDate, league.year);
  const built = buildSeasonCalendar(inputs, start);
  if (!built.ok) throw new Error(`calendário impossível: ${JSON.stringify(built.issues)}`);
  return { ok: true, league, competitions, calendar: built.calendar, fitness: { players: {} } };
}

/** Jogo de um clube no calendário da temporada (contracts/calendar-api.md). */
export interface ClubFixture {
  /** Índice do dia no calendário. */
  day: number;
  date: string;
  competitionId: string;
  divisionLevel: number;
  round: number;
  home: string;
  away: string;
  /** Fase e grupo do jogo, numa divisão em fases (019). */
  stage?: FixtureStage;
  /** Rodada dentro da fase (a 1ª rodada da fase é 1), numa divisão em fases. */
  stageRound?: number;
  /** Confronto e perna, quando o jogo é de uma fase eliminatória de uma divisão em fases. */
  tie?: NonNullable<Fixture["tie"]>;
  /** Presente quando o jogo já foi disputado. */
  record?: MatchRecord;
}

/** Temporada de uma competição da carreira (a principal ou uma secundária). */
export function competitionSeason(
  state: Pick<CareerSeasonState, "league" | "competitions">,
  competitionId: string,
): LeagueSeason {
  const season =
    state.league.competitionId === competitionId
      ? state.league
      : state.competitions.find((entry) => entry.competitionId === competitionId);
  if (!season) throw new Error(`competição fora da carreira: ${competitionId}`);
  return season;
}

/** Todos os jogos do clube na temporada, por data, de todas as competições. */
export function clubFixtures(
  state: Pick<CareerSeasonState, "league" | "competitions" | "calendar">,
  clubId: string,
): ClubFixture[] {
  const fixtures: ClubFixture[] = [];
  const next = calendarNext(state);
  state.calendar.days.forEach((day, index) => {
    for (const slot of day.slots) {
      const season = competitionSeason(state, slot.competitionId);
      for (const division of season.divisions) {
        const fixture = division.calendar[slot.round - 1]?.fixtures.find(
          (entry) => entry.home === clubId || entry.away === clubId,
        );
        if (!fixture) continue;
        const record =
          index < next
            ? division.records.find(
                (entry) => entry.round === slot.round && entry.home === fixture.home,
              )
            : undefined;
        fixtures.push({
          day: index,
          date: day.date,
          competitionId: slot.competitionId,
          divisionLevel: division.divisionLevel,
          round: slot.round,
          home: fixture.home,
          away: fixture.away,
          ...(fixture.stage
            ? {
                stage: fixture.stage,
                stageRound:
                  slot.round -
                  (division.stages?.[fixture.stage.index]?.rounds[0] ?? slot.round) +
                  1,
                ...(fixture.tie ? { tie: fixture.tie } : {}),
              }
            : {}),
          ...(record ? { record } : {}),
        });
      }
    }
  });
  return fixtures;
}

/** Próximo jogo ainda não disputado do clube; undefined se não houver mais. */
export function nextClubFixture(
  state: Pick<CareerSeasonState, "league" | "competitions" | "calendar">,
  clubId: string,
): ClubFixture | undefined {
  return clubFixtures(state, clubId).find((fixture) => fixture.day >= calendarNext(state));
}

/** Jogo fechado num dia de jogos, de qualquer competição (entrada de torcida, diretoria e notícias). */
export interface DayMatch {
  competitionId: string;
  divisionLevel: number;
  date: string;
  fixture: Fixture;
  record: MatchRecord;
}

/** Os jogos de uma rodada recém-fechada de uma competição (somente leitura). */
export function roundMatches(season: LeagueSeason, round: number, date: string): DayMatch[] {
  const matches: DayMatch[] = [];
  for (const division of season.divisions) {
    for (const fixture of division.calendar[round - 1]?.fixtures ?? []) {
      const record = division.records.find(
        (entry) => entry.round === round && entry.home === fixture.home,
      );
      if (record) {
        matches.push({
          competitionId: season.competitionId,
          divisionLevel: division.divisionLevel,
          date,
          fixture,
          record,
        });
      }
    }
  }
  return matches;
}

/**
 * Indisponíveis do clube no próximo jogo dele (017 FR-026): a suspensão é a da competição do jogo e
 * as lesões valem de todas as competições. Sem próximo jogo, vale a competição principal.
 */
export function upcomingUnavailability(
  state: Pick<CareerSeasonState, "league" | "competitions" | "calendar" | "world">,
  clubId: string,
): SeasonUnavailability[] {
  const next = nextClubFixture(state, clubId);
  const league = competitionSeason(state, next?.competitionId ?? state.league.competitionId);
  const season = availabilitySeason(state.league, league, state.world, clubId);
  return season ? clubUnavailability(season, state.world, clubId) : [];
}

/** Suspensões do clube em outras competições que não a do próximo jogo (só informação, 017 FR-026). */
export function otherSuspensions(
  state: Pick<CareerSeasonState, "league" | "competitions" | "calendar" | "world">,
  clubId: string,
): { competitionId: string; playerId: string; remaining: number }[] {
  const next = nextClubFixture(state, clubId)?.competitionId ?? state.league.competitionId;
  const result: { competitionId: string; playerId: string; remaining: number }[] = [];
  for (const league of [state.league, ...state.competitions]) {
    if (league.competitionId === next) continue;
    const season = clubDivision(league, clubId);
    if (!season) continue;
    for (const player of state.world.players) {
      if (player.clubId !== clubId) continue;
      const remaining = season.status[player.id]?.suspension ?? 0;
      if (remaining > 0)
        result.push({ competitionId: league.competitionId, playerId: player.id, remaining });
    }
  }
  return result;
}
