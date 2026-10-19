import {
  type FinanceError,
  type FinanceResult,
  repayLoan,
  setTicketPrice,
  startStadiumWorks,
  takeLoan,
} from "@brasfoot-like/engine";
import type { SaveFile } from "./format";

export type FinanceSaveResult = { ok: true; save: SaveFile } | { ok: false; error: FinanceError };

function apply(save: SaveFile, result: FinanceResult): FinanceSaveResult {
  return result.ok ? { ok: true, save: { ...save, finances: result.finances } } : result;
}

/** Preço do ingresso do clube do jogador (contracts/save-and-mod.md). */
export function setManagerTicketPrice(save: SaveFile, price: number): FinanceSaveResult {
  return apply(
    save,
    setTicketPrice(save.finances, save.bank, save.league.competitionId, save.clubId, price),
  );
}

export function takeManagerLoan(save: SaveFile, amount: number): FinanceSaveResult {
  return apply(save, takeLoan(save.finances, save.league, save.bank, save.clubId, amount));
}

export function repayManagerLoan(save: SaveFile, amount: number): FinanceSaveResult {
  return apply(save, repayLoan(save.finances, save.league, save.clubId, amount));
}

export function startManagerStadiumWorks(save: SaveFile, optionIndex: number): FinanceSaveResult {
  return apply(
    save,
    startStadiumWorks(save.finances, save.league, save.bank, save.clubId, optionIndex),
  );
}
