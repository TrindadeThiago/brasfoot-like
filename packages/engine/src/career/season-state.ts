import type { BoardState } from "../board/types";
import { addDays, seasonDate } from "../calendar/date";
import { roundDates, scheduleOf } from "../calendar/schedule";
import {
  buildSeasonCalendar,
  type CalendarCompetition,
  type CalendarDay,
  dayIndexAfter,
  SEASON_DAYS,
  type SeasonCalendar,
} from "../calendar/season-calendar";
import type { FansState } from "../fans/types";
import type { FinanceState } from "../finance/types";
import type { FitnessState } from "../fitness/types";
import type { SeasonUnavailability } from "../lineup/types";
import { clubUnavailability } from "../lineup/unavailability";
import type { MarketState } from "../market/types";
import type { CompletedBank } from "../model/types";
import type { NewsState } from "../news/types";
import type { RenewalState } from "../renewal/types";
import type { SeasonError } from "../season/errors";
import type { Fixture, MatchRecord, PlayerStatus } from "../season/types";
import { availabilitySeason } from "./injuries";
import { clubDivision, createLeagueSeason, leagueRound, leagueTotalRounds } from "./league";
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
}

/** A parte da temporada da carreira que depende só do banco: competições, calendário e condição. */
export type CareerSeasonSet = Pick<
  CareerSeasonState,
  "league" | "competitions" | "calendar" | "fitness"
>;

export type CareerSeasonResult =
  | ({ ok: true } & CareerSeasonSet)
  | { ok: false; error: SeasonError };

/**
 * Cria a temporada de todas as competições do banco (017 R4): a principal (a primeira) com a seed
 * de sempre, as secundárias com a seed `${careerSeed}:${competitionId}`, e o calendário por datas.
 * O banco já foi validado, então um calendário impossível aqui é erro de programação.
 */
export function createCareerSeason(
  world: CompletedBank,
  options: CareerSeasonOptions,
): CareerSeasonResult {
  const created: LeagueSeason[] = [];
  for (const [position, competition] of world.competitions.entries()) {
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
  const [league, ...competitions] = created;
  if (!league) throw new Error("banco sem competições");
  const inputs: CalendarCompetition[] = created.map((season) => ({
    competitionId: season.competitionId,
    rounds: leagueTotalRounds(season),
    clubIds: [...new Set(season.divisions.flatMap((division) => division.clubIds))].sort(),
    schedule: scheduleOf(world, season.competitionId),
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
