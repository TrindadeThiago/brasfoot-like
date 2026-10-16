import type { CompletedBank, Lineup, LineupChange, Season } from "@brasfoot-like/engine";

/** Versão atual do formato do save (Princípio VI). */
export const SAVE_FORMAT_VERSION = 2;

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
  season: Season;
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
