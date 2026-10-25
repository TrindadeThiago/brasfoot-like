import type { LeagueSeason } from "../career/types";
import type { FansState } from "../fans/types";
import type { FinanceState } from "../finance/types";
import type { CompletedBank } from "../model/types";

/** Níveis de meta esportiva, do mais ao menos exigente (research.md R4). */
export const GOAL_TIERS = [
  "title",
  "promotion",
  "qualify",
  "top4",
  "topHalf",
  "avoidRelegation",
  "avoidBottom",
] as const;
export type GoalTierId = (typeof GOAL_TIERS)[number];

export const FINANCE_GOAL_KINDS = ["nonNegativeCash", "keepCash", "noCrisis"] as const;
export type FinanceGoalKind = (typeof FINANCE_GOAL_KINDS)[number];

/** Momento da carreira: temporada e rodadas já jogadas nela (0 = antes da primeira). */
export interface RoundRef {
  season: number;
  round: number;
}

export interface SeasonGoals {
  season: number;
  /** Rodadas jogadas quando as metas foram definidas. */
  round: number;
  sport: {
    tier: GoalTierId;
    position: number;
    expectation: number;
    midSeason?: boolean;
    /** Competição de destino da meta `qualify` (021). */
    competitionId?: string;
  };
  /** Meta continental da temporada, para o clube que disputa uma competição entre países (022). */
  continental?: {
    competitionId: string;
    target: { stage: number; phase?: number | undefined };
    /** Preenchidos quando a campanha do clube termina (eliminação ou título). */
    reached?: { stage: number; phase?: number | undefined };
    result?: "met" | "missed";
    champion?: boolean;
  };
  finance: { kind: FinanceGoalKind; startCash: number };
}

export const CONFIDENCE_FACTORS = [
  "win",
  "draw",
  "loss",
  "belowGoal",
  "aheadOfGoal",
  "crisis",
  "financeGoal",
  "seasonStart",
  "hired",
  "derbyWin",
  "derbyDraw",
  "derbyLoss",
  "fans",
  "cupOut",
  "cupTitle",
  "cupGoal",
  "continentalMet",
  "continentalMiss",
] as const;
export type ConfidenceFactor = (typeof CONFIDENCE_FACTORS)[number];

export interface ConfidenceChange {
  season: number;
  round: number;
  delta: number;
  value: number;
  factors: { kind: ConfidenceFactor; amount: number }[];
}

/** Meta continental (022) como o jogador a vê: fase esperada, alcançada e resultado. */
export type ContinentalProgress = NonNullable<SeasonGoals["continental"]>;

export interface GoalProgress {
  continental?: ContinentalProgress;
  sport: {
    tier: GoalTierId;
    required: number;
    current: number;
    met: boolean;
    competitionId?: string;
  };
  finance: {
    kind: FinanceGoalKind;
    met: boolean;
    cash: number;
    startCash: number;
    inCrisis: boolean;
  };
}

export type Achievement = "title" | "promotion" | "relegation" | "continentalTitle";
export type BoardDecision = "kept" | "fired" | "wouldFire";

export interface SeasonEvaluation {
  continental?: ContinentalProgress;
  season: number;
  clubId: string;
  sport: {
    tier: GoalTierId;
    required: number;
    final: number;
    met: boolean;
    competitionId?: string;
  };
  finance: { kind: FinanceGoalKind; met: boolean };
  finalConfidence: number;
  decision: BoardDecision;
  reputationBefore: number;
  reputationAfter: number;
  achievements: Achievement[];
}

export interface ManagerProfile {
  reputation: number;
  noFiring: boolean;
  /** `null` = desempregado; para o motor vira `""` (research.md R3). */
  clubId: string | null;
  hired?: RoundRef;
  /** Carência explícita (saves migrados): não é demitido até este momento, inclusive. */
  graceUntil?: RoundRef;
  /** Clube que o demitiu: não faz proposta na mesma temporada. */
  firedBy?: { clubId: string; season: number };
}

export interface ClubBoard {
  clubId: string;
  /** Técnico da IA; `null` no clube do jogador ou com a vaga aberta. */
  coachId: string | null;
  goals?: SeasonGoals;
  confidence: number;
  hired: RoundRef;
  /** Últimas mudanças de confiança (só no clube do jogador). */
  recent: ConfidenceChange[];
}

export interface Coach {
  id: string;
  name: string;
  reputation: number;
  clubId: string | null;
}

export interface Vacancy {
  id: string;
  clubId: string;
  season: number;
  round: number;
  /** A vaga já passou pelo sorteio de proposta ao jogador. */
  considered: boolean;
  offerId?: string;
}

export type JobOfferStatus = "pending" | "accepted" | "declined" | "expired";

export interface JobOffer {
  id: string;
  clubId: string;
  season: number;
  round: number;
  /** Última rodada jogada em que a proposta ainda vale. */
  expiresRound: number;
  goals: SeasonGoals;
  status: JobOfferStatus;
}

export type StintExit = "fired" | "left" | "offerAccepted";

export interface Stint {
  /** `null` = período sem clube. */
  clubId: string | null;
  from: RoundRef;
  to?: RoundRef;
  exit?: StintExit;
}

export interface ManagerSeasonRecord {
  season: number;
  year: number;
  clubId: string | null;
  level?: number;
  position?: number;
  goals?: {
    sportTier: GoalTierId;
    sportCompetitionId?: string;
    sportPosition: number;
    sportMet: boolean;
    financeKind: FinanceGoalKind;
    financeMet: boolean;
  };
  achievements: Achievement[];
  reputation: number;
  decision?: BoardDecision;
  /** Campanha continental da temporada, quando o clube disputou uma competição entre países (022). */
  continental?: ContinentalProgress;
}

export interface ManagerHistory {
  stints: Stint[];
  seasons: ManagerSeasonRecord[];
}

export interface BoardNotice {
  kind: "fired" | "hired";
  clubId: string;
  season: number;
  round: number;
}

export interface BoardState {
  manager: ManagerProfile;
  clubs: Record<string, ClubBoard>;
  coaches: Coach[];
  vacancies: Vacancy[];
  offers: JobOffer[];
  evaluation?: SeasonEvaluation;
  notice?: BoardNotice;
  history: ManagerHistory;
  nextSeq: number;
}

export interface BoardContext {
  world: CompletedBank;
  league: LeagueSeason;
  finances: FinanceState;
  board: BoardState;
  careerSeed: string;
  /** Humor das torcidas (013): pressão ou apoio na confiança. */
  fans?: FansState;
  /**
   * Rodada de uma liga de outro país que não o do técnico (020): só os clubes dela são avaliados;
   * o técnico entra apenas nas propostas das vagas dessa liga.
   */
  foreign?: boolean;
}

export interface BoardUpdate {
  board: BoardState;
  /** Clube que o jogador perdeu nesta rodada (demissão). */
  managerReleased?: string;
}

export type BoardErrorCode = "board.offer_not_found" | "board.offer_expired";

export interface BoardError {
  code: BoardErrorCode;
  params: Record<string, string | number>;
}
