import type { BoardState } from "../board/types";
import type { SeasonCalendar } from "../calendar/season-calendar";
import type { FansState } from "../fans/types";
import type { FinanceState } from "../finance/types";
import type { CupHistoryEntry } from "../knockout/history";
import type { MarketState } from "../market/types";
import type { CompletedBank } from "../model/types";
import type { NewsState } from "../news/types";
import type {
  BerthZone,
  Origin,
  QualificationRecord,
  QualificationResult,
} from "../qualification/types";
import type { RenewalState } from "../renewal/types";
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
  /** Como cada participante chegou (021 R7); só em competições com vagas. */
  origins?: Record<string, Origin>;
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
  /** Faixas que dão vaga em outras competições (021); vazio sem vagas. */
  berths: BerthZone[];
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

/** Artilheiro guardado no histórico (020 R7). */
export interface HistoryScorer {
  playerId: string;
  clubId: string;
  goals: number;
}

export interface HistoryDivision {
  level: number;
  championId: string;
  standings: HistoryRow[];
  /** Os 10 maiores artilheiros da divisão na temporada (020 R7). */
  topScorers?: HistoryScorer[];
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
  /** Mundo vivo: as etapas de renovação (009) o substituem; as seguintes usam o novo. */
  world: CompletedBank;
  readonly careerSeed: string;
  /** Temporada encerrada (somente leitura). */
  readonly finished: LeagueSeason;
  /** Classificação final de cada nível. */
  readonly finalStandings: Readonly<Record<number, StandingRow[]>>;
  history: SeasonHistoryEntry[];
  next: NextSeasonDraft;
  /** Nova temporada, criada pela etapa `generate-calendars`. */
  league?: LeagueSeason;
  /** Competições secundárias encerradas e o calendário da temporada encerrada (017). */
  readonly finishedCompetitions?: readonly LeagueSeason[];
  readonly finishedCalendar?: SeasonCalendar;
  /** Competições secundárias e calendário da nova temporada, criados por `generate-calendars`. */
  competitions?: LeagueSeason[];
  calendar?: SeasonCalendar;
  /** Histórico das competições secundárias (uma entrada por temporada encerrada, 017). */
  competitionHistory?: SeasonHistoryEntry[];
  /** Histórico das copas (uma entrada por edição encerrada, 018). */
  cupHistory?: CupHistoryEntry[];
  /** Classificações entre competições resolvidas, uma por temporada encerrada (021). */
  qualificationHistory?: QualificationRecord[];
  /** Resultado da etapa `resolve-qualification` desta virada (021). */
  qualification?: QualificationResult;
  /** Finanças da carreira (008); ausentes em usos só da liga. */
  finances?: FinanceState;
  /** Clube do jogador: as decisões da IA não o alteram. */
  managerClubId?: string;
  /** Estado de renovação do mundo (009). */
  renewal?: RenewalState;
  /** Mercado de transferências (010): livres, negociações e propostas. */
  market?: MarketState;
  /** Diretorias, técnicos e carreira do técnico (012). */
  board?: BoardState;
  /** Humor das torcidas (013). */
  fans?: FansState;
  /** Manchetes, recordes e memória do mundo (014). */
  news?: NewsState;
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
  /** Finanças da temporada encerrada (008). */
  finances?: FinanceState;
  managerClubId?: string;
  renewal?: RenewalState;
  market?: MarketState;
  board?: BoardState;
  fans?: FansState;
  news?: NewsState;
  /** Competições secundárias encerradas, o calendário da temporada e o histórico delas (017). */
  competitions?: readonly LeagueSeason[];
  calendar?: SeasonCalendar;
  competitionHistory?: readonly SeasonHistoryEntry[];
  cupHistory?: readonly CupHistoryEntry[];
  qualificationHistory?: readonly QualificationRecord[];
}

export type TurnoverResult =
  | {
      ok: true;
      league: LeagueSeason;
      history: SeasonHistoryEntry[];
      finances?: FinanceState;
      /** Mundo vivo depois da virada. */
      world: CompletedBank;
      renewal?: RenewalState;
      market?: MarketState;
      board?: BoardState;
      fans?: FansState;
      news?: NewsState;
      /** Competições secundárias e calendário da nova temporada (017). */
      competitions?: LeagueSeason[];
      calendar?: SeasonCalendar;
      competitionHistory?: SeasonHistoryEntry[];
      cupHistory?: CupHistoryEntry[];
      qualificationHistory?: QualificationRecord[];
    }
  | { ok: false; error: SeasonError };
