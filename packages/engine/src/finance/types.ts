/** Finanças da carreira (data-model.md da 008). Valores monetários são inteiros. */

export const LEDGER_CATEGORIES = [
  "gate",
  "sponsorship",
  "prize",
  "loan_in",
  "wages",
  "interest",
  "loan_out",
  "stadium",
  "transfer_purchase",
  "transfer_sale",
] as const;

export type LedgerCategory = (typeof LEDGER_CATEGORIES)[number];

export interface StadiumWorks {
  seats: number;
  cost: number;
  /** Rodadas da liga até a obra terminar. */
  remainingRounds: number;
}

export interface ClubFinance {
  clubId: string;
  /** Caixa atual; pode ser negativo. */
  cash: number;
  debt: number;
  ticketPrice: number;
  capacity: number;
  works?: StadiumWorks;
  /** Rodadas seguidas fechadas com caixa negativo. */
  negativeRounds: number;
  inCrisis: boolean;
  /** Caixa no início da temporada. */
  seasonStartCash: number;
}

/** Movimentação de dinheiro: receitas positivas, despesas negativas. */
export interface LedgerEntry {
  clubId: string;
  /** Número da temporada (`LeagueSeason.number`). */
  season: number;
  /** Rodada da liga; 0 = início de temporada ou virada. */
  round: number;
  category: LedgerCategory;
  amount: number;
  /** Data do jogo, nas bilheterias do calendário por datas (017). */
  date?: string;
  /** Competição do jogo, nas bilheterias do calendário por datas (017). */
  competitionId?: string;
}

export interface GateRecord {
  season: number;
  round: number;
  clubId: string;
  opponentId: string;
  attendance: number;
  capacity: number;
  price: number;
  revenue: number;
  /** Data e competição do jogo, nas bilheterias do calendário por datas (017). */
  date?: string;
  competitionId?: string;
}

export interface FinanceSeasonSummary {
  season: number;
  year: number;
  clubId: string;
  startCash: number;
  endCash: number;
  totals: Record<LedgerCategory, number>;
  debtEnd: number;
  capacityEnd: number;
}

export interface CrisisRecord {
  clubId: string;
  startSeason: number;
  startRound: number;
  endSeason?: number;
  endRound?: number;
}

export interface FinanceState {
  clubs: Record<string, ClubFinance>;
  /** Lançamentos da temporada atual. */
  ledger: LedgerEntry[];
  /** Bilheterias da temporada atual. */
  gates: GateRecord[];
  /** Resumos das temporadas encerradas. */
  seasons: FinanceSeasonSummary[];
  crises: CrisisRecord[];
}

export interface StadiumOption {
  seats: number;
  cost: number;
  rounds: number;
}

export interface DivisionEconomy {
  level: number;
  referencePrice: number;
  fanFactorPct: number;
  /** Patrocínio anual = base + perReputation × rep + wageSharePct% da folha anual (R6). */
  sponsorship: { base: number; perReputation: number; wageSharePct: number };
  prizes: { first: number; last: number; title: number };
  creditBase: number;
}

/** Regras econômicas da competição (`competition.economy` com os padrões aplicados). */
export interface EconomyRules {
  /** Torcida = (fansBase + fansPerReputation × rep) × fanFactorPct (R5). */
  fansBase: number;
  fansPerReputation: number;
  priceElasticityPct: number;
  priceRange: { min: number; max: number };
  credit: { perReputation: number; interestBp: number };
  stadium: { maxCapacity: number; options: StadiumOption[] };
  crisisRounds: number;
  wageFactorPct: number;
  divisions: DivisionEconomy[];
}
