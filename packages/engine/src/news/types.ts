import type { BoardState } from "../board/types";
import type { LeagueSeason } from "../career/types";
import type { MarketState } from "../market/types";
import type { CompletedBank } from "../model/types";

/** Tipos de manchete (research.md R3 da 014). */
export const HEADLINE_TYPES = [
  "result",
  "hatTrick",
  "rout",
  "comeback",
  "upset",
  "derby",
  "streak",
  "droughtEnd",
  "record",
  "coachFired",
  "coachHired",
  "managerFired",
  "managerHired",
  "bigTransfer",
  "titleClinched",
  "promotionClinched",
  "relegationConfirmed",
  "seasonSummary",
  "cupUpset",
  "cupElimination",
  "cupFinal",
  "cupChampion",
  "qualification",
  "continentalAdvanced",
  "continentalEliminated",
  "continentalChampion",
  "continentalRout",
  "regionalChampion",
  "regionalPromoted",
  "regionalRelegated",
] as const;
export type HeadlineType = (typeof HEADLINE_TYPES)[number];

export type HeadlineVars = Record<string, string | number>;

/**
 * Manchete estruturada: o motor só produz tipo, variáveis e índice da variação; o texto vem dos
 * templates `news.<tipo>.<variação>` na camada de apresentação (Princípio VII).
 * Variáveis com ids de clube: `club`, `opponent`, `winner`, `loser`, `prevClub`, `prevOpponent`;
 * nomes de jogadores e técnicos vêm prontos (sobrevivem à aposentadoria).
 */
export interface Headline {
  id: string;
  type: HeadlineType;
  relevance: number;
  variant: number;
  clubIds: string[];
  /** Omitido quando vazio (economia de espaço no save). */
  playerIds?: string[];
  vars: HeadlineVars;
  /** Fatos complementares do mesmo jogo. */
  extras?: { type: HeadlineType; vars: HeadlineVars }[];
  /** Envolve o clube do jogador. */
  mine: boolean;
  /** Jogo de origem (`home-away`), para agrupar fatos do mesmo jogo. */
  match?: string;
}

export interface RoundFeed {
  season: number;
  year: number;
  /** 0 = resumo da temporada anterior. */
  round: number;
  headlines: Headline[];
}

export const LEAGUE_RECORD_KINDS = [
  "biggestWin",
  "mostGoalsMatch",
  "mostPlayerGoalsSeason",
  "mostPointsSeason",
  "longestWinStreak",
] as const;
export type LeagueRecordKind = (typeof LEAGUE_RECORD_KINDS)[number];

export const CLUB_RECORD_KINDS = [
  "biggestWin",
  "biggestLoss",
  "mostPlayerGoalsSeason",
  "mostPointsSeason",
] as const;
export type ClubRecordKind = (typeof CLUB_RECORD_KINDS)[number];

export interface RecordEntry {
  value: number;
  /** Desempate (ex.: gols marcados na maior vitória). */
  secondary?: number;
  clubId?: string;
  opponentId?: string;
  playerId?: string;
  playerName?: string;
  score?: [number, number];
  season: number;
  year: number;
  round?: number;
}

export interface Records {
  league: Partial<Record<LeagueRecordKind, RecordEntry>>;
  clubs: Record<string, Partial<Record<ClubRecordKind, RecordEntry>>>;
}

export interface PlayerTotals {
  name: string;
  goals: number;
  matches: number;
  clubs: Record<string, { goals: number; matches: number }>;
}

export interface AllTime {
  players: Record<string, PlayerTotals>;
}

export interface SeasonNews {
  season: number;
  year: number;
  scorers: { level: number; playerId?: string; name?: string; clubId?: string; goals: number }[];
}

export interface NewsState {
  feed: RoundFeed[];
  records: Records;
  allTime: AllTime;
  seasons: SeasonNews[];
}

export interface NewsContext {
  world: CompletedBank;
  /** Liga com a rodada já fechada. */
  league: LeagueSeason;
  news: NewsState;
  careerSeed: string;
  /** "" quando o técnico está desempregado. */
  managerClubId: string;
  /** Mercado depois da rodada (log com as transferências da rodada). */
  market?: MarketState;
  /** Diretoria antes e depois da rodada (técnicos demitidos e contratados, 012). */
  boardBefore?: BoardState;
  boardAfter?: BoardState;
}

export interface Legend {
  playerId: string;
  name: string;
  goals: number;
  matches: number;
}
