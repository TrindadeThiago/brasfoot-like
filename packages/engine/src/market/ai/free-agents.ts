import { respondToContract, wageDemand } from "../player-response";
import { canAddPlayer } from "../squad";
import type { FreeAgent, MarketContext } from "../types";
import type { ClubNeeds } from "./needs";
import { aiMarketRules } from "./rules";

export interface FreeSigningPlan {
  agent: FreeAgent;
  wage: number;
}

/**
 * Livre que cobre uma carência do clube (011 R7): posição descoberta ou fraca, melhora o titular
 * provável (ou cobre o mínimo), o atleta aceita e o salário de um ano cabe no orçamento.
 */
export function freeAgentFor(
  context: MarketContext,
  needs: ClubNeeds,
  excluded: ReadonlySet<string> = new Set(),
): FreeSigningPlan | undefined {
  if (needs.clubId === context.managerClubId || needs.priorities.length === 0) return undefined;
  const rules = aiMarketRules(context.world, context.league.competitionId);
  let best: FreeSigningPlan | undefined;
  for (const agent of context.market.freeAgents) {
    const { player } = agent;
    if (excluded.has(player.id) || !needs.priorities.includes(player.position)) continue;
    const need = needs.positions[player.position];
    if (!need.uncovered && player.strength - need.starter < rules.minGain) continue;
    if (!canAddPlayer(context.world, needs.clubId, player.position, context.managerClubId))
      continue;
    const wage = wageDemand(context, player, needs.clubId);
    if (12 * wage > needs.budget && !need.uncovered) continue;
    if (respondToContract(context, player, needs.clubId, wage).kind !== "accepted") continue;
    if (
      !best ||
      player.strength > best.agent.player.strength ||
      (player.strength === best.agent.player.strength && player.id < best.agent.player.id)
    ) {
      best = { agent, wage };
    }
  }
  return best;
}
