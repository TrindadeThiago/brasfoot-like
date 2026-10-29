import {
  type CrisisRecord,
  type FinanceSeasonSummary,
  type GateRecord,
  type LedgerCategory,
  seasonFinanceSummary,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";

/** Categorias de receita (origem) e de despesa (destino), as mesmas das tabelas de Finanças. */
export const ORIGIN_CATEGORIES = [
  "gate",
  "sponsorship",
  "prize",
  "loan_in",
  "transfer_sale",
] as const satisfies readonly LedgerCategory[];
export const DESTINATION_CATEGORIES = [
  "wages",
  "interest",
  "loan_out",
  "stadium",
  "transfer_purchase",
] as const satisfies readonly LedgerCategory[];

export interface BalancePoint {
  /** `AAAA-MM`, ou "start" para o caixa do início da temporada. */
  key: string;
  cash: number;
}
export interface MonthFlow {
  month: string;
  income: number;
  expense: number;
}
/** `termination`: a parte dos salários que foi multa de rescisão (lançada em `wages`). */
export type BreakdownCategory = LedgerCategory | "termination";
export interface BreakdownRow {
  category: BreakdownCategory;
  amount: number;
  percent: number;
}
export interface DebtPoint {
  key: string;
  debt: number;
}

const monthOf = (date: string) => date.slice(0, 7);

/** Lançamentos do clube do jogador na temporada em curso, com o mês de cada um (se conhecido). */
function ledgerOf(
  save: SaveFile,
): { amount: number; category: LedgerCategory; month: string | undefined }[] {
  const leagueId = save.league.competitionId;
  const roundDate = new Map<number, string>();
  for (const day of save.calendar.days) {
    for (const slot of day.slots) {
      if (slot.competitionId === leagueId && !roundDate.has(slot.round)) {
        roundDate.set(slot.round, day.date);
      }
    }
  }
  const start = save.calendar.days[0]?.date;
  return save.finances.ledger
    .filter((entry) => entry.clubId === save.clubId)
    .map((entry) => {
      const date =
        entry.date ?? roundDate.get(entry.round) ?? (entry.round === 0 ? start : undefined);
      return {
        amount: entry.amount,
        category: entry.category,
        month: date ? monthOf(date) : undefined,
      };
    });
}

/** O extrato leva o caixa do início da temporada ao caixa atual (conciliação do gráfico). */
function reconciles(save: SaveFile): boolean {
  const club = save.finances.clubs[save.clubId];
  if (!club) return false;
  const total = ledgerOf(save).reduce((sum, entry) => sum + entry.amount, 0);
  return club.seasonStartCash + total === club.cash;
}

/** Soma por mês; devolve `undefined` se algum lançamento não tem mês conhecido. */
function byMonth(save: SaveFile) {
  const entries = ledgerOf(save);
  if (entries.some((entry) => entry.month === undefined)) return undefined;
  const months = [...new Set(entries.map((entry) => entry.month as string))].sort();
  return { entries, months };
}

/** Saldo ao longo da temporada: o do início e o de cada mês, ou `undefined` sem dado confiável. */
export function balanceSeries(save: SaveFile): BalancePoint[] | undefined {
  const club = save.finances.clubs[save.clubId];
  const grouped = byMonth(save);
  if (!club || !grouped || !reconciles(save)) return undefined;
  let cash = club.seasonStartCash;
  const points: BalancePoint[] = [{ key: "start", cash }];
  for (const month of grouped.months) {
    cash += grouped.entries
      .filter((entry) => entry.month === month)
      .reduce((sum, entry) => sum + entry.amount, 0);
    points.push({ key: month, cash });
  }
  return points;
}

/** Receitas e despesas por mês (despesa em valor positivo). */
export function monthlyFlows(save: SaveFile): MonthFlow[] | undefined {
  const grouped = byMonth(save);
  if (!grouped || !reconciles(save)) return undefined;
  return grouped.months.map((month) => {
    const entries = grouped.entries.filter((entry) => entry.month === month);
    return {
      month,
      income: entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0),
      expense: entries.filter((e) => e.amount < 0).reduce((sum, e) => sum - e.amount, 0),
    };
  });
}

/** Divisão das receitas por origem ou das despesas por destino, com o percentual de cada uma. */
export function breakdown(
  save: SaveFile,
  kind: "origin" | "destination",
): BreakdownRow[] | undefined {
  if (!reconciles(save)) return undefined;
  const { totals } = seasonFinanceSummary(save.finances, save.clubId);
  const categories = kind === "origin" ? ORIGIN_CATEGORIES : DESTINATION_CATEGORIES;
  const amounts: { category: BreakdownCategory; amount: number }[] = categories.map((category) => ({
    category,
    amount: Math.abs(totals[category]),
  }));
  if (kind === "destination") {
    // A rescisão é lançada na categoria de salários; o registro do mercado diz quanto foi multa.
    const termination = save.market.log
      .filter(
        (entry) =>
          entry.kind === "released" &&
          entry.reason === "termination" &&
          entry.fromClubId === save.clubId &&
          entry.season === save.league.number,
      )
      .reduce((sum, entry) => sum + entry.fee, 0);
    const wages = amounts.find((row) => row.category === "wages");
    if (wages && termination > 0 && termination <= wages.amount) {
      wages.amount -= termination;
      amounts.splice(amounts.indexOf(wages) + 1, 0, {
        category: "termination",
        amount: termination,
      });
    }
  }
  const rows = amounts.filter((row) => row.amount > 0);
  const sum = rows.reduce((total, row) => total + row.amount, 0);
  if (sum === 0) return undefined;
  return rows.map((row) => ({ ...row, percent: Math.round((row.amount / sum) * 1000) / 10 }));
}

/**
 * Dívida ao longo da temporada. Só `loan_in` e `loan_out` mudam a dívida (juros são despesa de
 * caixa): a do início é a atual menos os fluxos da temporada, e tem de bater com a `debtEnd` da
 * temporada anterior (ou ser 0, na primeira).
 */
export function debtSeries(save: SaveFile): DebtPoint[] | undefined {
  const club = save.finances.clubs[save.clubId];
  const grouped = byMonth(save);
  if (!club || !grouped) return undefined;
  const flow = (entry: { category: LedgerCategory; amount: number }) =>
    entry.category === "loan_in" || entry.category === "loan_out" ? entry.amount : 0;
  const total = grouped.entries.reduce((sum, entry) => sum + flow(entry), 0);
  const start = club.debt - total;
  const previous = save.finances.seasons.filter((s) => s.clubId === save.clubId).at(-1);
  // Na primeira temporada todo clube começa sem dívida (`createFinances`).
  if (start !== (previous?.debtEnd ?? 0)) return undefined;
  let debt = start;
  const points: DebtPoint[] = [{ key: "start", debt }];
  for (const month of grouped.months) {
    debt += grouped.entries
      .filter((entry) => entry.month === month)
      .reduce((sum, entry) => sum + flow(entry), 0);
    points.push({ key: month, debt });
  }
  return points;
}

/** Bilheterias do clube na temporada: público, capacidade, preço e receita por jogo em casa. */
export function attendanceSeries(save: SaveFile): GateRecord[] {
  return save.finances.gates
    .filter((gate) => gate.clubId === save.clubId)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.round - b.round);
}

/** Histórico financeiro das temporadas encerradas do clube e as crises. */
export function seasonHistory(save: SaveFile): {
  seasons: FinanceSeasonSummary[];
  crises: CrisisRecord[];
} {
  return {
    seasons: save.finances.seasons.filter((entry) => entry.clubId === save.clubId),
    crises: save.finances.crises.filter((entry) => entry.clubId === save.clubId),
  };
}
