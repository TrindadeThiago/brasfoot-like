import type { Competition } from "../model/types";
import { addDays, diffDays } from "./date";
import { type CompetitionSchedule, roundDates, scheduleOfCompetition } from "./schedule";

/** Calendário da temporada por datas (data-model.md da 017). */

/** Dias de uma temporada, do primeiro ao último (52 semanas). */
export const SEASON_DAYS = 364;

/** Rodada de uma competição que acontece num dia. */
export interface CalendarSlot {
  competitionId: string;
  round: number;
}

export interface CalendarDay {
  /** Data ISO. */
  date: string;
  /** Rodadas do dia, na ordem de `competitions.json`. */
  slots: CalendarSlot[];
}

export interface SeasonCalendar {
  /** Primeiro dia da temporada (data ISO). */
  start: string;
  /** Último dia da temporada (data ISO). */
  end: string;
  /** Dias com jogos, em ordem de data e sem datas repetidas. */
  days: CalendarDay[];
}

/** Data da rodada `round` da competição; undefined se ela não existe no calendário. */
export function dateOfRound(
  calendar: SeasonCalendar,
  competitionId: string,
  round: number,
): string | undefined {
  return calendar.days.find((day) =>
    day.slots.some((slot) => slot.competitionId === competitionId && slot.round === round),
  )?.date;
}

/**
 * Índice do primeiro dia ainda não disputado, dado quantas rodadas cada competição já fechou
 * (`done`). O andamento vem das temporadas, não do calendário: ele é só a agenda (017 R4).
 */
export function dayIndexAfter(calendar: SeasonCalendar, done: Readonly<Record<string, number>>) {
  let index = 0;
  while (index < calendar.days.length) {
    const day = calendar.days[index] as CalendarDay;
    if (!day.slots.every((slot) => (done[slot.competitionId] ?? 0) >= slot.round)) break;
    index++;
  }
  return index;
}

/** O que o calendário precisa saber de uma competição para atribuir datas. */
export interface CalendarCompetition {
  competitionId: string;
  /** Rodadas da competição (a divisão mais longa). */
  rounds: number;
  /** Clubes de todas as divisões, em ordem de id. */
  clubIds: readonly string[];
  schedule: CompetitionSchedule;
}

export type CalendarIssue =
  | {
      code: "calendar.club_double_booked";
      /** A competição de posição mais tardia no banco. */
      competitionId: string;
      otherCompetitionId: string;
      clubId: string;
      date: string;
    }
  | {
      code: "calendar.competition_overflow";
      competitionId: string;
      /** Semanas da temporada até a última rodada da competição. */
      needed: number;
      /** Semanas da temporada. */
      available: number;
    };

/** Rodadas de uma divisão de `clubCount` clubes em `turns` turnos (como `generateCalendar`). */
export function theoreticalRounds(clubCount: number, turns: number): number {
  return turns * (clubCount % 2 === 0 ? clubCount - 1 : clubCount);
}

/** Competições do banco no formato do calendário, na ordem do banco. */
export function calendarCompetitions(competitions: readonly Competition[]): CalendarCompetition[] {
  return competitions.map((competition) => ({
    competitionId: competition.id,
    rounds: Math.max(
      0,
      ...competition.divisions.map((division) =>
        theoreticalRounds(division.clubIds.length, competition.format.rounds),
      ),
    ),
    clubIds: [...new Set(competition.divisions.flatMap((division) => division.clubIds))].sort(),
    schedule: scheduleOfCompetition(competition),
  }));
}

/** Primeiro elemento comum de duas listas ordenadas; undefined se não houver. */
function firstCommon(a: readonly string[], b: readonly string[]): string | undefined {
  const other = new Set(b);
  return a.find((value) => other.has(value));
}

/**
 * Monta o calendário da temporada (017 R3): a data de cada rodada de cada competição, agrupadas
 * por dia na ordem do banco. Recusa o que não cabe: rodadas além das 52 semanas e clube com dois
 * jogos no mesmo dia (verificado pelos clubes das competições, sem depender da seed).
 */
export function buildSeasonCalendar(
  competitions: readonly CalendarCompetition[],
  start: string,
): { ok: true; calendar: SeasonCalendar } | { ok: false; issues: CalendarIssue[] } {
  const end = addDays(start, SEASON_DAYS - 1);
  const issues: CalendarIssue[] = [];
  const dates = competitions.map((entry) => roundDates(entry.schedule, start, entry.rounds));
  competitions.forEach((entry, index) => {
    const mine = dates[index] ?? [];
    const last = mine.at(-1);
    if (last !== undefined && last > end) {
      issues.push({
        code: "calendar.competition_overflow",
        competitionId: entry.competitionId,
        needed: Math.floor(diffDays(start, last) / 7) + 1,
        available: SEASON_DAYS / 7,
      });
    }
    for (let earlier = 0; earlier < index; earlier++) {
      const other = competitions[earlier];
      if (!other) continue;
      const clubId = firstCommon(entry.clubIds, other.clubIds);
      if (clubId === undefined) continue;
      const date = firstCommon([...mine].sort(), dates[earlier] ?? []);
      if (date === undefined) continue;
      issues.push({
        code: "calendar.club_double_booked",
        competitionId: entry.competitionId,
        otherCompetitionId: other.competitionId,
        clubId,
        date,
      });
    }
  });
  if (issues.length > 0) return { ok: false, issues };

  const slotsByDate = new Map<string, CalendarSlot[]>();
  competitions.forEach((entry, index) => {
    (dates[index] ?? []).forEach((date, round) => {
      const slots = slotsByDate.get(date) ?? [];
      slots.push({ competitionId: entry.competitionId, round: round + 1 });
      slotsByDate.set(date, slots);
    });
  });
  const days = [...slotsByDate.keys()].sort().map((date) => ({
    date,
    slots: slotsByDate.get(date) as CalendarSlot[],
  }));
  return { ok: true, calendar: { start, end, days } };
}
