import type { Competition, CompletedBank } from "../model/types";
import { addDays, weekdayOf } from "./date";

/** Quando a competição joga (data-model.md da 017): dia da semana ISO, semana inicial e intervalo. */
export interface CompetitionSchedule {
  /** 1 = segunda-feira … 7 = domingo. */
  weekday: number;
  /** Semanas depois do primeiro `weekday` da temporada em que a 1ª rodada acontece. */
  startWeek: number;
  /** Semanas entre rodadas consecutivas. */
  everyWeeks: number;
}

/** Uma rodada por domingo, a partir do início da temporada (017 R1). */
export const DEFAULT_SCHEDULE: CompetitionSchedule = { weekday: 7, startWeek: 0, everyWeeks: 1 };

/** Agenda declarada pela competição sobre o padrão. */
export function scheduleOfCompetition(
  competition: Pick<Competition, "schedule">,
): CompetitionSchedule {
  const declared = competition.schedule ?? {};
  return {
    weekday: declared.weekday ?? DEFAULT_SCHEDULE.weekday,
    startWeek: declared.startWeek ?? DEFAULT_SCHEDULE.startWeek,
    everyWeeks: declared.everyWeeks ?? DEFAULT_SCHEDULE.everyWeeks,
  };
}

/** Agenda da competição do banco: os campos que o mod declara sobre o padrão. */
export function scheduleOf(
  world: Pick<CompletedBank, "competitions">,
  competitionId: string,
): CompetitionSchedule {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  if (!competition) throw new Error(`competição inexistente: ${competitionId}`);
  return scheduleOfCompetition(competition);
}

/** Datas das `rounds` primeiras rodadas de uma competição que joga na `schedule` (017 R1). */
export function roundDates(schedule: CompetitionSchedule, start: string, rounds: number): string[] {
  const ahead = (schedule.weekday - weekdayOf(start) + 7) % 7;
  const first = addDays(start, ahead + schedule.startWeek * 7);
  const dates: string[] = [];
  for (let round = 0; round < rounds; round++) {
    dates.push(addDays(first, round * schedule.everyWeeks * 7));
  }
  return dates;
}
