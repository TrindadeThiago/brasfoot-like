import type {
  CompletedBank,
  LeagueSeason,
  Lineup,
  LineupChange,
  SeasonHistoryEntry,
} from "@brasfoot-like/engine";

/** Versão atual do formato do save (Princípio VI). */
export const SAVE_FORMAT_VERSION = 3;

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
