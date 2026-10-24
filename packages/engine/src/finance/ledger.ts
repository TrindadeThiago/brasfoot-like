import type { FinanceState, LedgerEntry } from "./types";

/**
 * Cópia de trabalho das finanças: clubes e listas copiados, para que as funções públicas nunca
 * alterem a entrada e possam lançar em sequência sem custo de cópia por lançamento.
 */
/** Listas que o rascunho ainda divide com a entrada: copiam-se só na primeira escrita (020 R12). */
const SHARED = new WeakMap<FinanceState, { ledger: boolean; gates: boolean }>();

export function draft(finances: FinanceState): FinanceState {
  const working: FinanceState = {
    clubs: Object.fromEntries(
      Object.entries(finances.clubs).map(([clubId, club]) => [
        clubId,
        { ...club, ...(club.works ? { works: { ...club.works } } : {}) },
      ]),
    ),
    ledger: finances.ledger,
    gates: finances.gates,
    seasons: [...finances.seasons],
    crises: finances.crises.map((crisis) => ({ ...crisis })),
  };
  SHARED.set(working, { ledger: true, gates: true });
  return working;
}

/** Acrescenta uma bilheteria ao rascunho. */
export function pushGate(working: FinanceState, record: FinanceState["gates"][number]): void {
  const shared = SHARED.get(working);
  if (shared?.gates) {
    working.gates = [...working.gates];
    shared.gates = false;
  }
  working.gates.push(record);
}

/** Lança uma movimentação e atualiza o caixa do clube no mesmo passo (R3). Altera `working`. */
export function post(working: FinanceState, entry: LedgerEntry): void {
  if (!Number.isInteger(entry.amount)) throw new Error(`lançamento não inteiro: ${entry.amount}`);
  const club = working.clubs[entry.clubId];
  if (!club) throw new Error(`clube sem finanças: ${entry.clubId}`);
  if (entry.amount === 0) return;
  club.cash += entry.amount;
  const shared = SHARED.get(working);
  if (shared?.ledger) {
    working.ledger = [...working.ledger];
    shared.ledger = false;
  }
  working.ledger.push(entry);
}
