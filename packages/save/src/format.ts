import type {
  BoardState,
  CompletedBank,
  FansState,
  FinanceState,
  FitnessState,
  LeagueSeason,
  Lineup,
  LineupChange,
  MarketState,
  NewsState,
  RenewalState,
  SeasonCalendar,
  SeasonHistoryEntry,
} from "@brasfoot-like/engine";

/** Versão atual do formato do save (Princípio VI). */
export const SAVE_FORMAT_VERSION = 12;

export const MANAGER_NAME_MAX = 40;

/** Carreira salva (contracts/save-format.md). */
export interface SaveFile {
  formatVersion: number;
  id: string;
  createdAt: string;
  savedAt: string;
  managerName: string;
  /**
   * Clube em foco: o do técnico, ou o último que ele treinou quando está desempregado (v8,
   * research.md R3). O emprego de verdade está em `board.manager.clubId`.
   */
  clubId: string;
  seed: string;
  bank: CompletedBank;
  /** Temporada da competição inteira, uma Season por divisão (v3; substitui `season`). */
  league: LeagueSeason;
  /** Uma entrada por temporada encerrada (v3). */
  history: SeasonHistoryEntry[];
  /** Competições secundárias da temporada, na ordem do banco; vazio no banco padrão (v12). */
  competitions: LeagueSeason[];
  /** Calendário da temporada por datas, de todas as competições (v12). */
  calendar: SeasonCalendar;
  /** Condição física dos jogadores (v12). */
  fitness: FitnessState;
  /** Uma entrada por temporada encerrada de cada competição secundária (v12). */
  competitionHistory: SeasonHistoryEntry[];
  /** Finanças de todos os clubes da competição (v4). */
  finances: FinanceState;
  /** Estado da renovação do mundo (v5). `bank` é o mundo vivo da carreira desde a 009. */
  renewal: RenewalState;
  /** Livres, negociações, propostas (v6) e resumos de janela (v7) do mercado. Contratos ficam em `bank.players[].contract`. */
  market: MarketState;
  /** Diretorias, técnicos da IA e carreira do técnico (v8). */
  board: BoardState;
  /** Humor das torcidas (v9). Rivalidades ficam em `bank.rivalries`. */
  fans: FansState;
  /** Manchetes, recordes e memória do mundo (v10). */
  news: NewsState;
  /** Imagens de escudo do banco da carreira: caminho no pacote → data URI (v11). */
  assets: Record<string, string>;
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
