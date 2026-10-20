import type {
  CompletedBank,
  FinanceState,
  LeagueSeason,
  Lineup,
  LineupChange,
  MarketState,
  RenewalState,
  SeasonHistoryEntry,
} from "@brasfoot-like/engine";

/** Versão atual do formato do save (Princípio VI). */
export const SAVE_FORMAT_VERSION = 6;

export const MANAGER_NAME_MAX = 40;

/** Carreira salva (contracts/save-format.md). */
export interface SaveFile {
  formatVersion: number;
  id: string;
  createdAt: string;
  savedAt: string;
  managerName: string;
  clubId: string;
  seed: string;
  bank: CompletedBank;
  /** Temporada da competição inteira, uma Season por divisão (v3; substitui `season`). */
  league: LeagueSeason;
  /** Uma entrada por temporada encerrada (v3). */
  history: SeasonHistoryEntry[];
  /** Finanças de todos os clubes da competição (v4). */
  finances: FinanceState;
  /** Estado da renovação do mundo (v5). `bank` é o mundo vivo da carreira desde a 009. */
  renewal: RenewalState;
  /** Livres, negociações e propostas do mercado (v6). Contratos ficam em `bank.players[].contract`. */
  market: MarketState;
  /** Escalação do clube do jogador (v2). */
  lineup: Lineup;
  /** Trocas do último ajuste automático, até o jogador dispensar o aviso (v2). */
  lineupNotice?: LineupChange[];
}

export type SaveErrorCode = "save.invalid_name" | "save.invalid_bank" | "save.club_not_in_league";

export interface SaveError {
  code: SaveErrorCode;
  params: Record<string, string | number>;
}
