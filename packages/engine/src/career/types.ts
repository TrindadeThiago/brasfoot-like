import type { CompletedBank } from "../model/types";
import type { Rng } from "../rng/xoshiro";
import type { SeasonError } from "../season/errors";
import type { DisciplineRules, PlayerStatus, Season, StandingRow } from "../season/types";

/** Temporada da competição do país inteira: uma `Season` por divisão (data-model.md). */
export interface LeagueSeason {
  competitionId: string;
  /** Número da temporada na carreira (1 = primeira). */
  number: number;
  /** Ano exibido; inicial = ano de `manifest.referenceDate`. */
  year: number;
  /** Seed da temporada (research.md R3), igual à de todas as divisões. */
  seed: string;
  /** Uma por divisão da competição, em ordem crescente de nível. */
  divisions: Season[];
}

export interface LeagueSeasonOptions {
  competitionId: string;
  careerSeed: string;
  /** Padrão 1. */
  number?: number;
  /** Padrão: ano de `manifest.referenceDate`. */
  year?: number;
  /** Composição por nível; padrão: a do banco. */
  composition?: Record<number, readonly string[]>;
  /** Situação inicial dos jogadores (lesões herdadas). */
  status?: Record<string, PlayerStatus>;
  rules?: Partial<DisciplineRules>;
}

export type LeagueResult = { ok: true; league: LeagueSeason } | { ok: false; error: SeasonError };

/** Vagas de acesso e rebaixamento de uma divisão, para marcar a classificação. */
export interface DivisionZones {
  level: number;
  promotion: number;
  relegation: number;
}

/** Linha da classificação final guardada no histórico (subconjunto de `StandingRow`). */
export interface HistoryRow {
  position: number;
  clubId: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

export interface HistoryDivision {
  level: number;
  championId: string;
  standings: HistoryRow[];
  /** Clubes que saíram desta divisão para a de cima. */
  promoted: string[];
  /** Clubes que saíram desta divisão para a de baixo. */
  relegated: string[];
}

export interface SeasonHistoryEntry {
  number: number;
  year: number;
  competitionId: string;
  divisions: HistoryDivision[];
}

/** Rascunho da próxima temporada, preenchido pelas etapas da virada. */
export interface NextSeasonDraft {
  number: number;
  year: number;
  seed: string;
  /** Clubes de cada nível na próxima temporada. */
  composition: Record<number, string[]>;
  /** Situação dos jogadores que passa para a próxima temporada. */
  carryOver: Record<string, PlayerStatus>;
}

export interface TurnoverContext {
  readonly world: CompletedBank;
  readonly careerSeed: string;
  /** Temporada encerrada (somente leitura). */
  readonly finished: LeagueSeason;
  /** Classificação final de cada nível. */
  readonly finalStandings: Readonly<Record<number, StandingRow[]>>;
  history: SeasonHistoryEntry[];
  next: NextSeasonDraft;
  /** Nova temporada, criada pela etapa `generate-calendars`. */
  league?: LeagueSeason;
  /** Gerador próprio de cada etapa (não depende das outras etapas). */
  rng(stepId: string): Rng;
}

/** Passo da virada de temporada: função pura que devolve um novo contexto. */
export interface TurnoverStep {
  id: string;
  run(context: TurnoverContext): TurnoverContext;
}

export type TurnoverRegistration =
  | { step: TurnoverStep; before: string; after?: never }
  | { step: TurnoverStep; after: string; before?: never };

export interface TurnoverOptions {
  careerSeed: string;
  /** Etapas de sistemas futuros; padrão nenhuma. */
  extraSteps?: readonly TurnoverRegistration[];
}

export type TurnoverResult =
  | { ok: true; league: LeagueSeason; history: SeasonHistoryEntry[] }
  | { ok: false; error: SeasonError };
