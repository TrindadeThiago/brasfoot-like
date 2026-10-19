import type { FinanceState, LedgerEntry } from "./types";

/**
 * Cópia de trabalho das finanças: clubes e listas copiados, para que as funções públicas nunca
 * alterem a entrada e possam lançar em sequência sem custo de cópia por lançamento.
 */
export function draft(finances: FinanceState): FinanceState {
  return {
    clubs: Object.fromEntries(
      Object.entries(finances.clubs).map(([clubId, club]) => [
        clubId,
        { ...club, ...(club.works ? { works: { ...club.works } } : {}) },
      ]),
    ),
    ledger: [...finances.ledger],
    gates: [...finances.gates],
    seasons: [...finances.seasons],
    crises: finances.crises.map((crisis) => ({ ...crisis })),
  };
}

/** Lança uma movimentação e atualiza o caixa do clube no mesmo passo (R3). Altera `working`. */
export function post(working: FinanceState, entry: LedgerEntry): void {
  if (!Number.isInteger(entry.amount)) throw new Error(`lançamento não inteiro: ${entry.amount}`);
  const club = working.clubs[entry.clubId];
  if (!club) throw new Error(`clube sem finanças: ${entry.clubId}`);
  if (entry.amount === 0) return;
  club.cash += entry.amount;
  working.ledger.push(entry);
}
