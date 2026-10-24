import { marketRules } from "../rules";
import type { MarketContext, TransferRecord } from "../types";
import { roundsPlayed, transferWindows } from "../windows";

/** Índice da janela que contém a rodada jogada (ou -1 fora das janelas). */
export function windowIndex(context: Pick<MarketContext, "world" | "league">): number {
  const rules = marketRules(context.world, context.league.competitionId);
  const played = roundsPlayed(context.league);
  return transferWindows(context.league, rules).findIndex(
    (window) => played >= window.fromRound && played <= window.toRound,
  );
}

/** Transferências concluídas da janela atual (sem desfechos de negociação). */
export function windowDeals(context: MarketContext): TransferRecord[] {
  const rules = marketRules(context.world, context.league.competitionId);
  const window = transferWindows(context.league, rules)[windowIndex(context)];
  if (!window) return [];
  return context.market.log.filter(
    (entry) =>
      entry.season === context.league.number &&
      entry.outcome === undefined &&
      entry.round >= window.fromRound &&
      entry.round <= window.toRound,
  );
}

/** Compras (definitivas ou empréstimos recebidos) do clube na janela. */
export function buysInWindow(context: MarketContext, clubId: string): number {
  return windowDeals(context).filter(
    (entry) =>
      entry.toClubId === clubId &&
      entry.fromClubId !== undefined &&
      (entry.kind === "buy" ||
        entry.kind === "sale" ||
        entry.kind === "loan" ||
        entry.kind === "loan_out"),
  ).length;
}

/** Compras do clube na janela a clubes de outro país (020 R13). */
export function internationalBuysInWindow(context: MarketContext, clubId: string): number {
  const countryOf = (id: string | undefined) =>
    context.world.clubs.find((club) => club.id === id)?.countryId;
  const own = countryOf(clubId);
  return windowDeals(context).filter(
    (entry) =>
      entry.toClubId === clubId &&
      entry.fromClubId !== undefined &&
      countryOf(entry.fromClubId) !== own &&
      (entry.kind === "buy" ||
        entry.kind === "sale" ||
        entry.kind === "loan" ||
        entry.kind === "loan_out"),
  ).length;
}

/** Vendas e empréstimos cedidos pelo clube na janela. */
export function salesInWindow(context: MarketContext, clubId: string): number {
  return windowDeals(context).filter(
    (entry) =>
      entry.fromClubId === clubId &&
      (entry.kind === "buy" ||
        entry.kind === "sale" ||
        entry.kind === "loan" ||
        entry.kind === "loan_out"),
  ).length;
}
