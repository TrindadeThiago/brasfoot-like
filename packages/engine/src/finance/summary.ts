import { type FinanceState, LEDGER_CATEGORIES, type LedgerCategory } from "./types";

/** Totais por categoria da temporada atual do clube e saldos inicial e atual (US4). */
export function seasonFinanceSummary(
  finances: FinanceState,
  clubId: string,
): { startCash: number; cash: number; totals: Record<LedgerCategory, number> } {
  const totals = Object.fromEntries(LEDGER_CATEGORIES.map((category) => [category, 0])) as Record<
    LedgerCategory,
    number
  >;
  for (const entry of finances.ledger) {
    if (entry.clubId === clubId) totals[entry.category] += entry.amount;
  }
  const club = finances.clubs[clubId];
  return { startCash: club?.seasonStartCash ?? 0, cash: club?.cash ?? 0, totals };
}
