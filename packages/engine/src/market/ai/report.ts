import { clubDivision } from "../../career/league";
import { marketRules } from "../rules";
import type { MarketContext, MarketState, ReportEntry, WindowReport } from "../types";
import { roundsPlayed, transferWindows } from "../windows";
import { aiMarketRules } from "./rules";

const DEAL_KINDS = new Set(["buy", "sale", "loan", "loan_out", "free"]);

/** Ordem de relevância: valor, depois força, depois id. */
function byRelevance(a: ReportEntry, b: ReportEntry): number {
  return b.fee - a.fee || b.strength - a.strength || (a.playerId < b.playerId ? -1 : 1);
}

/** Índice da janela que acabou de fechar nesta rodada, se houver. */
export function closedWindow(context: Pick<MarketContext, "world" | "league">): number | undefined {
  const rules = marketRules(context.world, context.league.competitionId);
  const played = roundsPlayed(context.league);
  const index = transferWindows(context.league, rules).findIndex(
    (window) => window.toRound + 1 === played,
  );
  return index >= 0 ? index : undefined;
}

/** Resumo das transferências concluídas numa janela (011 R10), guardado no mercado. */
export function closeWindowReport(context: MarketContext, window: number): MarketState {
  const rules = marketRules(context.world, context.league.competitionId);
  const range = transferWindows(context.league, rules)[window];
  if (!range) return context.market;
  const id = `${context.league.number}-${window}`;
  if (context.market.reports.some((report) => report.id === id)) return context.market;
  const levelOf = (clubId?: string) =>
    clubId ? clubDivision(context.league, clubId)?.divisionLevel : undefined;
  const transfers: ReportEntry[] = [];
  for (const entry of context.market.log) {
    if (entry.season !== context.league.number || entry.outcome !== undefined) continue;
    if (
      !DEAL_KINDS.has(entry.kind) ||
      entry.round < range.fromRound ||
      entry.round > range.toRound
    ) {
      continue;
    }
    const player = context.world.players.find((candidate) => candidate.id === entry.playerId);
    if (!player) continue;
    const fromLevel = levelOf(entry.fromClubId);
    const toLevel = levelOf(entry.toClubId);
    transfers.push({
      ...entry,
      position: player.position,
      strength: player.strength,
      ...(fromLevel !== undefined ? { fromLevel } : {}),
      ...(toLevel !== undefined ? { toLevel } : {}),
    });
  }
  const report: WindowReport = {
    id,
    season: context.league.number,
    year: context.league.year,
    window,
    transfers: transfers.sort(byRelevance),
  };
  const keep = aiMarketRules(context.world, context.league.competitionId).keepReports;
  return { ...context.market, reports: [...context.market.reports, report].slice(-keep) };
}

/** As transferências mais relevantes do resumo. */
export function reportHighlights(report: WindowReport, limit: number): ReportEntry[] {
  return report.transfers.slice(0, limit);
}

/** Transferências do resumo que envolvem clubes de uma divisão. */
export function reportForDivision(report: WindowReport, level: number): ReportEntry[] {
  return report.transfers.filter((entry) => entry.fromLevel === level || entry.toLevel === level);
}
