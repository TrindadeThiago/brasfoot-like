import type { CompletedPlayer } from "../model/types";
import type { FreeAgent, MarketState } from "./types";

/** Jogador que sai do clube: perde `clubId` e `contract` e passa a ser livre (R2). */
export function toFreeAgent(
  player: CompletedPlayer,
  lastClubId: string,
  sinceYear: number,
): FreeAgent {
  const { clubId: _clubId, contract: _contract, ...rest } = player;
  return { player: rest, lastClubId, sinceYear };
}

/** Acrescenta livres ao mercado, mantidos em ordem de id. */
export function addFreeAgents(market: MarketState, agents: readonly FreeAgent[]): MarketState {
  const byId = new Map(market.freeAgents.map((agent) => [agent.player.id, agent]));
  for (const agent of agents) byId.set(agent.player.id, agent);
  const freeAgents = [...byId.values()].sort((a, b) =>
    a.player.id < b.player.id ? -1 : a.player.id > b.player.id ? 1 : 0,
  );
  return { ...market, freeAgents };
}
