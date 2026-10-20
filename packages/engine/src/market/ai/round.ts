import { ageOn, seasonDate } from "../../calendar/date";
import type { CompletedPlayer } from "../../model/types";
import { completeLoan, completeSigning, completeTransfer } from "../effects";
import { marketRules } from "../rules";
import type { MarketContext, MarketUpdate } from "../types";
import { isWindowOpen } from "../windows";
import { freeAgentFor } from "./free-agents";
import { youthLoan } from "./loans";
import { clubNeeds } from "./needs";
import { aiMarketRules } from "./rules";
import { cachedNeeds, type NeedsCache } from "./seller";
import { purchaseTarget } from "./targets";
import { buysInWindow } from "./window";

/** Duração do contrato que a IA oferece, pela idade. */
export function aiContractYears(player: CompletedPlayer, date: string): number {
  const age = ageOn(player.birthDate, date);
  if (age >= 33) return 1;
  if (age >= 30) return 2;
  if (age <= 23) return 4;
  return 3;
}

function apply(context: MarketContext, update: MarketUpdate): MarketContext {
  return { ...context, world: update.world, finances: update.finances, market: update.market };
}

/** Clubes da IA da competição, em ordem de id. */
export function aiClubs(context: MarketContext): string[] {
  return context.league.divisions
    .flatMap((season) => season.clubIds)
    .filter((clubId) => clubId !== context.managerClubId)
    .sort();
}

/**
 * Uma rodada de decisões dos clubes da IA (011 R1). Clubes em ordem de id; com a janela aberta,
 * compras por necessidade (uma por clube por rodada); em qualquer rodada, livres por carência.
 */
export function aiMarketRound(context: MarketContext): MarketUpdate {
  const rules = aiMarketRules(context.world, context.league.competitionId);
  let current = context;
  const moved = new Set<string>();
  const departed: string[] = [];
  if (isWindowOpen(context.league, marketRules(context.world, context.league.competitionId))) {
    let deals = 0;
    const cache: NeedsCache = new Map();
    const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
    for (const clubId of aiClubs(context)) {
      if (deals >= rules.maxDealsPerRound) break;
      if (buysInWindow(current, clubId) >= rules.maxBuysPerWindow) continue;
      const needs = cachedNeeds(current, clubId, cache);
      for (const position of [...needs.priorities, ...needs.upgrades]) {
        const plan = purchaseTarget(current, needs, position, moved, cache);
        if (!plan) continue;
        const done = completeTransfer(current, {
          playerId: plan.player.id,
          toClubId: clubId,
          fee: plan.fee,
          contract: {
            wage: plan.wage,
            untilYear: current.league.year + aiContractYears(plan.player, date) - 1,
          },
        });
        if (!done.ok) continue;
        departed.push(...done.value.departed);
        current = apply(current, done.value);
        cache.delete(clubId);
        cache.delete(plan.player.clubId);
        moved.add(plan.player.id);
        deals++;
        break;
      }
    }
  }
  if (isWindowOpen(current.league, marketRules(current.world, current.league.competitionId))) {
    // Empréstimos de jovens (R6): um cedido por clube por janela.
    const cache: NeedsCache = new Map();
    for (const clubId of aiClubs(current)) {
      const plan = youthLoan(current, clubId, cache, moved);
      if (!plan) continue;
      const done = completeLoan(current, {
        playerId: plan.playerId,
        toClubId: plan.toClubId,
        fee: 0,
      });
      if (!done.ok) continue;
      current = apply(current, done.value);
      cache.delete(clubId);
      cache.delete(plan.toClubId);
      moved.add(plan.playerId);
    }
  }
  // Livres por carência (R7), em qualquer rodada.
  let signings = 0;
  const date = seasonDate(current.world.manifest.referenceDate, current.league.year);
  for (const clubId of aiClubs(current)) {
    if (signings >= rules.maxFreeSigningsPerRound || current.market.freeAgents.length === 0) break;
    const plan = freeAgentFor(current, clubNeeds(current, clubId), moved);
    if (!plan) continue;
    const done = completeSigning(current, {
      agent: plan.agent,
      clubId,
      contract: {
        wage: plan.wage,
        untilYear:
          current.league.year +
          aiContractYears({ ...plan.agent.player, clubId } as CompletedPlayer, date) -
          1,
      },
    });
    if (!done.ok) continue;
    current = apply(current, done.value);
    moved.add(plan.agent.player.id);
    signings++;
  }
  return {
    world: current.world,
    finances: current.finances,
    market: current.market,
    departed,
  };
}
