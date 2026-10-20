import { ageOn, seasonDate } from "../../calendar/date";
import { canAddPlayer, canRemovePlayer, strengthRank } from "../squad";
import type { MarketContext } from "../types";
import { aiMarketRules } from "./rules";
import { cachedNeeds, type NeedsCache } from "./seller";
import { buysInWindow, salesInWindow, windowDeals } from "./window";

export interface LoanPlan {
  playerId: string;
  toClubId: string;
}

function reputationOf(context: MarketContext, clubId: string): number {
  return context.world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
}

/**
 * Empréstimo de um jovem promissor que não joga (011 R6): sem taxa, para um clube da IA menor em
 * que ele seria titular na posição. No máximo um empréstimo cedido por clube por janela.
 */
export function youthLoan(
  context: MarketContext,
  clubId: string,
  cache?: NeedsCache,
  excluded: ReadonlySet<string> = new Set(),
): LoanPlan | undefined {
  if (clubId === context.managerClubId) return undefined;
  const rules = aiMarketRules(context.world, context.league.competitionId);
  const deals = windowDeals(context);
  if (deals.some((entry) => entry.fromClubId === clubId && entry.kind === "loan_out")) {
    return undefined;
  }
  if (salesInWindow(context, clubId) >= rules.maxSalesPerWindow) return undefined;
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  const prospects = context.world.players
    .filter(
      (player) =>
        player.clubId === clubId &&
        !player.contract?.loan &&
        !excluded.has(player.id) &&
        !deals.some((entry) => entry.playerId === player.id) &&
        ageOn(player.birthDate, date) <= rules.loanMaxAge &&
        player.hidden.potential >= rules.loanMinPotential &&
        strengthRank(context.world, clubId, player.id) > rules.loanBenchRank &&
        canRemovePlayer(context.world, clubId, player.id),
    )
    .sort((a, b) => b.hidden.potential - a.hidden.potential || (a.id < b.id ? -1 : 1));
  const origin = reputationOf(context, clubId);
  const borrowers = context.league.divisions
    .flatMap((season) => season.clubIds)
    .filter(
      (id) => id !== clubId && id !== context.managerClubId && reputationOf(context, id) < origin,
    )
    .sort();
  for (const player of prospects) {
    let best: { clubId: string; starter: number } | undefined;
    for (const borrower of borrowers) {
      if (!canAddPlayer(context.world, borrower, player.position)) continue;
      if (buysInWindow(context, borrower) >= rules.maxBuysPerWindow) continue;
      const starter = cachedNeeds(context, borrower, cache).positions[player.position].starter;
      if (player.strength < starter) continue;
      if (!best || starter < best.starter) best = { clubId: borrower, starter };
    }
    if (best) return { playerId: player.id, toClubId: best.clubId };
  }
  return undefined;
}
