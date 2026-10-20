import { cancelNegotiation } from "./negotiation";
import type { MarketContext, MarketState } from "./types";

/**
 * O técnico deixou o clube (012 R11): as negociações abertas do clube são canceladas (motivo
 * `manager_left`) e as propostas recebidas pelos jogadores dele são descartadas.
 */
export function releaseManagerClub(context: MarketContext, clubId: string): MarketState {
  let current = context;
  const open = context.market.negotiations
    .filter((negotiation) => negotiation.clubId === clubId)
    .map((negotiation) => negotiation.id)
    .sort();
  for (const negotiationId of open) {
    const update = cancelNegotiation(current, negotiationId, "manager_left");
    current = { ...current, world: update.world, finances: update.finances, market: update.market };
  }
  const squad = new Set(
    context.world.players.filter((player) => player.clubId === clubId).map((player) => player.id),
  );
  return {
    ...current.market,
    incoming: current.market.incoming.filter((offer) => !squad.has(offer.playerId)),
  };
}
