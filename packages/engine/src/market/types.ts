import type { LeagueSeason } from "../career/types";
import type { FinanceState } from "../finance/types";
import type { CompletedBank, CompletedPlayer, Position, Trait } from "../model/types";
import type { MarketErrorCode } from "./errors";

/** Contratos e mercado (data-model.md da 010). Valores monetários são inteiros. */

export interface Contract {
  /** Salário mensal. */
  wage: number;
  /** Último ano de contrato. */
  untilYear: number;
  /** Empréstimo: `clubId` do jogador é o clube que recebe. */
  loan?: { fromClubId: string; untilYear: number };
}

/** Jogador sem clube e sem contrato. */
export type FreePlayer = Omit<CompletedPlayer, "clubId" | "contract">;

export interface FreeAgent {
  player: FreePlayer;
  lastClubId: string;
  sinceYear: number;
}

export type NegotiationKind = "buy" | "loan" | "free" | "renew";
export type NegotiationStage = "club_offer" | "club_countered" | "contract" | "player_demanded";

export interface Negotiation {
  id: string;
  playerId: string;
  kind: NegotiationKind;
  /** Clube do usuário. */
  clubId: string;
  fromClubId?: string;
  stage: NegotiationStage;
  fee?: number;
  counterFee?: number;
  agreedFee?: number;
  wage?: number;
  years?: number;
  demandWage?: number;
  openedRound: number;
}

export interface IncomingOffer {
  id: string;
  playerId: string;
  fromClubId: string;
  fee: number;
  /** Compra ou empréstimo (o clube interessado pede o jogador emprestado). */
  kind: "buy" | "loan";
  expiresRound: number;
  /** Contraproposta única do usuário. */
  countered?: { fee: number };
}

export type TransferKind =
  | "buy"
  | "loan"
  | "free"
  | "renew"
  | "sale"
  | "loan_out"
  | "expired"
  | "released";

export type NegotiationOutcome = "refused_club" | "refused_player" | "rejected_by_user" | "expired";

export interface TransferRecord {
  season: number;
  round: number;
  playerId: string;
  displayName: string;
  kind: TransferKind;
  fromClubId?: string;
  toClubId?: string;
  fee: number;
  wage?: number;
  untilYear?: number;
  outcome?: NegotiationOutcome;
  reason?: string;
}

/** Transferência no resumo da janela (011 R10). */
export interface ReportEntry extends TransferRecord {
  position: Position;
  strength: number;
  /** Nível da divisão do clube de origem e do destino (filtro do resumo). */
  fromLevel?: number;
  toLevel?: number;
}

/** Resumo das transferências de uma janela (011 R10). */
export interface WindowReport {
  /** `<temporada>-<janela>`. */
  id: string;
  season: number;
  year: number;
  window: number;
  transfers: ReportEntry[];
}

export interface MarketState {
  freeAgents: FreeAgent[];
  negotiations: Negotiation[];
  incoming: IncomingOffer[];
  log: TransferRecord[];
  nextSeq: number;
  /** Resumos das últimas janelas (011). */
  reports: WindowReport[];
  /** Id do último resumo que o jogador dispensou. */
  reportSeen?: string;
}

export interface MarketWindow {
  fromRound: number;
  toRound: number;
}

export interface MarketRules {
  windows?: MarketWindow[];
  contractYears: { min: number; max: number; veteranAge: number; veteranMax: number };
  lastYearValuePct: number;
  twoYearsValuePct: number;
  club: {
    counterThresholdPct: number;
    keyPlayerPct: number;
    noiseMinPct: number;
    noiseMaxPct: number;
    maxBidMinPct: number;
    maxBidMaxPct: number;
    loanFeePct: number;
  };
  player: { demandThresholdPct: number; interestMargin: number; divisionBonus: number[] };
  incoming: {
    chancePct: number;
    maxOpen: number;
    expireRounds: number;
    minPct: number;
    maxPct: number;
    cashBufferMonths: number;
  };
  freeAgents: { maxSeasons: number; retireAge: number };
  ai: { renewMaxAge: number; renewTopN: number; wageReviewPct: number };
}

export interface MarketContext {
  world: CompletedBank;
  league: LeagueSeason;
  finances: FinanceState;
  market: MarketState;
  managerClubId: string;
  careerSeed: string;
}

export interface MarketUpdate {
  world: CompletedBank;
  finances: FinanceState;
  market: MarketState;
  /** Jogadores que saíram do clube do usuário (para ajustar a escalação). */
  departed: string[];
}

export interface MarketError {
  code: MarketErrorCode;
  params: Record<string, string | number>;
}

export type MarketResult<T> = { ok: true; value: T } | { ok: false; error: MarketError };

export type ClubResponse =
  | { kind: "accepted" }
  | { kind: "countered"; fee: number }
  | { kind: "refused"; reason: "low_offer" | "squad_minimum" | "key_player" };

export type PlayerResponse =
  | { kind: "accepted" }
  | { kind: "demanded"; wage: number }
  | { kind: "refused"; reason: "no_interest" | "low_wage" };

export interface PlayerFilters {
  positions?: Position[];
  strength?: [number, number];
  age?: [number, number];
  maxValue?: number;
  maxWage?: number;
  contractUntilMax?: number;
  scope?: "all" | "clubs" | "free";
  excludeClubId?: string;
  text?: string;
}

/** Linha da busca: só atributos visíveis (nunca `hidden`). */
export interface MarketRow {
  playerId: string;
  displayName: string;
  position: Position;
  age: number;
  strength: number;
  traits: Trait[];
  clubId?: string;
  value: number;
  wage: number;
  untilYear?: number;
  onLoan: boolean;
  free: boolean;
}

export function emptyMarket(): MarketState {
  return { freeAgents: [], negotiations: [], incoming: [], log: [], nextSeq: 1, reports: [] };
}

export function marketError(
  code: MarketErrorCode,
  params: Record<string, string | number> = {},
): MarketError {
  return { code, params };
}

export function fail<T = never>(
  code: MarketErrorCode,
  params: Record<string, string | number> = {},
): MarketResult<T> {
  return { ok: false, error: marketError(code, params) };
}
