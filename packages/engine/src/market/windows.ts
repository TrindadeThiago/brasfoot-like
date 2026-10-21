import { dateOfRound, type SeasonCalendar } from "../calendar/season-calendar";
import { leagueRound } from "../career/league";
import type { LeagueSeason } from "../career/types";
import { midSeasonRound } from "../renewal/evolution";
import type { MarketRules, MarketWindow } from "./types";

/** Rodadas já jogadas da liga. */
export function roundsPlayed(league: LeagueSeason): number {
  const total = Math.max(...league.divisions.map((season) => season.calendar.length));
  return Math.min(total, leagueRound(league) - 1);
}

/** Janelas da temporada: as do mod ou o padrão (início e redor da rodada central, R5). */
export function transferWindows(league: LeagueSeason, rules: MarketRules): MarketWindow[] {
  if (rules.windows) return [...rules.windows].sort((a, b) => a.fromRound - b.fromRound);
  const mid = midSeasonRound(league);
  return [
    { fromRound: 0, toRound: 3 },
    { fromRound: Math.max(4, mid - 1), toRound: mid + 2 },
  ];
}

export function isWindowOpen(league: LeagueSeason, rules: MarketRules): boolean {
  const played = roundsPlayed(league);
  return transferWindows(league, rules).some(
    (window) => played >= window.fromRound && played <= window.toRound,
  );
}

/** Rodadas jogadas em que a janela atual fecha (undefined se fechada). */
export function currentWindowEnd(league: LeagueSeason, rules: MarketRules): number | undefined {
  const played = roundsPlayed(league);
  return transferWindows(league, rules).find(
    (window) => played >= window.fromRound && played <= window.toRound,
  )?.toRound;
}

/** Rodadas jogadas em que a próxima janela abre; undefined se só na próxima temporada. */
export function nextWindowRound(league: LeagueSeason, rules: MarketRules): number | undefined {
  const played = roundsPlayed(league);
  return transferWindows(league, rules).find((window) => window.fromRound > played)?.fromRound;
}

/** Datas de uma janela de transferência (017 R8). */
export interface WindowDates {
  /** Primeiro dia da janela: o início da temporada ou a data da rodada que a abre. */
  opensOn: string;
  /** Data da rodada que a fecha ao ser jogada (a última da liga, se a janela passa dela). */
  closesOn: string;
}

/**
 * As janelas (em rodadas jogadas da liga principal) com as datas do calendário: abre na data da
 * rodada `fromRound` (ou no início da temporada, com 0) e fecha na da rodada `toRound + 1`. Mods com
 * janelas em rodadas continuam válidos.
 */
export function windowDates(
  calendar: SeasonCalendar,
  competitionId: string,
  windows: readonly MarketWindow[],
): WindowDates[] {
  const dated = calendar.days.filter((day) =>
    day.slots.some((slot) => slot.competitionId === competitionId),
  );
  const lastLeagueDate = dated.at(-1)?.date ?? calendar.end;
  return windows.map((window) => ({
    opensOn:
      window.fromRound <= 0
        ? calendar.start
        : (dateOfRound(calendar, competitionId, window.fromRound) ?? lastLeagueDate),
    closesOn: dateOfRound(calendar, competitionId, window.toRound + 1) ?? lastLeagueDate,
  }));
}
