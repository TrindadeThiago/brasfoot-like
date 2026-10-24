import type { Competition, Division } from "../model/types";
import { isStaged, stageRoundRanges, stagesOf } from "../stages/rules";
import { addDays, diffDays } from "./date";
import { theoreticalRounds } from "./rounds";
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
  /** Semanas extras antes de cada rodada (o respiro antes da final da copa). */
  gaps?: readonly number[];
  /** Respiros declarados numa competição de mais de uma divisão: a grade de datas é uma só (019 R11). */
  gapConflict?: boolean;
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
    }
  | { code: "stages.gap_conflict"; competitionId: string };

export { theoreticalRounds };

/** Rodadas de uma divisão: as das suas fases (019) ou as da liga. */
function divisionRounds(competition: Competition, division: Division): number {
  if (isStaged(competition, division)) {
    return stageRoundRanges(stagesOf(competition, division), division.clubIds.length).reduce(
      (sum, range) => sum + range.length,
      0,
    );
  }
  const { format } = competition;
  return format.type === "league" ? theoreticalRounds(division.clubIds.length, format.rounds) : 0;
}

/** Rodadas (datas) de uma competição: as da liga, as das fases ou uma por perna de cada fase da copa. */
function roundsOf(competition: Competition): number {
  const { format } = competition;
  if (format.type === "knockout" && competition.divisions.every((d) => !isStaged(competition, d))) {
    return format.phases.reduce((sum, phase) => sum + phase.legs, 0);
  }
  return Math.max(
    0,
    ...competition.divisions.map((division) => divisionRounds(competition, division)),
  );
}

/** Semanas extras antes de cada rodada de uma divisão em fases (019 R11). */
function stageGaps(competition: Competition, division: Division): number[] {
  const stages = stagesOf(competition, division);
  const ranges = stageRoundRanges(stages, division.clubIds.length);
  const gaps: number[] = [];
  stages.forEach((stage, index) => {
    const count = ranges[index]?.length ?? 0;
    if (stage.type === "knockout") {
      for (const phase of stage.phases) {
        gaps.push(phase.gapWeeks ?? 0);
        for (let leg = 1; leg < phase.legs; leg++) gaps.push(0);
      }
      return;
    }
    gaps.push(stage.gapWeeks ?? 0);
    for (let round = 1; round < count; round++) gaps.push(0);
  });
  return gaps;
}

/** Respiros da competição: semanas extras antes da primeira rodada de cada fase com `gapWeeks`. */
export function gapsOf(competition: Competition): { gaps?: number[]; gapConflict?: true } {
  const staged = competition.divisions.filter((division) => isStaged(competition, division));
  if (staged.length > 0) {
    const arrays = staged.map((division) => stageGaps(competition, division));
    if (arrays.every((gaps) => gaps.every((gap) => gap === 0))) return {};
    // As datas são uma grade só por competição: respiros só cabem se há uma divisão.
    if (competition.divisions.length > 1) return { gapConflict: true };
    return { gaps: arrays[0] as number[] };
  }
  const { format } = competition;
  if (format.type !== "knockout" || format.phases.every((phase) => !phase.gapWeeks)) return {};
  const gaps: number[] = [];
  for (const phase of format.phases) {
    gaps.push(phase.gapWeeks ?? 0);
    for (let leg = 1; leg < phase.legs; leg++) gaps.push(0);
  }
  return { gaps };
}

/** Competições do banco no formato do calendário, na ordem do banco. */
export function calendarCompetitions(competitions: readonly Competition[]): CalendarCompetition[] {
  return competitions.map((competition) => ({
    competitionId: competition.id,
    rounds: roundsOf(competition),
    clubIds: [...new Set(competition.divisions.flatMap((division) => division.clubIds))].sort(),
    schedule: scheduleOfCompetition(competition),
    ...gapsOf(competition),
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
  for (const entry of competitions) {
    if (entry.gapConflict) {
      issues.push({ code: "stages.gap_conflict", competitionId: entry.competitionId });
    }
  }
  const dates = competitions.map((entry) =>
    roundDates(entry.schedule, start, entry.rounds, entry.gaps),
  );
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
