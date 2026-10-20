import type { CompletedPlayer } from "../../model/types";
import { askingPrice } from "../club-response";
import { canRemovePlayer, strengthRank } from "../squad";
import type { MarketContext } from "../types";
import { type ClubNeeds, clubNeeds } from "./needs";
import { aiMarketRules } from "./rules";
import { salesInWindow, windowDeals } from "./window";

const KEY_PLAYERS = 11;

function reputationOf(context: MarketContext, clubId: string): number {
  return context.world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
}

/** Necessidades por clube memorizadas dentro de uma rodada (invalidar após cada negócio). */
export type NeedsCache = Map<string, ClubNeeds>;

export function cachedNeeds(context: MarketContext, clubId: string, cache?: NeedsCache): ClubNeeds {
  const hit = cache?.get(clubId);
  if (hit) return hit;
  const needs = clubNeeds(context, clubId);
  cache?.set(clubId, needs);
  return needs;
}

/** O jogador está entre os excedentes do clube? */
export function isSurplus(
  context: MarketContext,
  player: CompletedPlayer,
  cache?: NeedsCache,
): boolean {
  return cachedNeeds(context, player.clubId, cache).surplus.includes(player.id);
}

/** Comprado nesta janela: não é revendido na mesma janela. */
function boughtThisWindow(context: MarketContext, playerId: string): boolean {
  return windowDeals(context).some((entry) => entry.playerId === playerId);
}

/**
 * Disposição do clube da IA em vender (011 R5): excedentes e reservas saem para qualquer clube;
 * titulares só "sobem" para clubes de reputação maior. Nunca quebra mínimos nem o limite de vendas.
 */
export function sellerAccepts(
  context: MarketContext,
  player: CompletedPlayer,
  buyerId: string,
  cache?: NeedsCache,
): boolean {
  if (player.clubId === context.managerClubId || player.contract?.loan) return false;
  if (!canRemovePlayer(context.world, player.clubId, player.id)) return false;
  if (boughtThisWindow(context, player.id)) return false;
  const rules = aiMarketRules(context.world, context.league.competitionId);
  if (salesInWindow(context, player.clubId) >= rules.maxSalesPerWindow) return false;
  const starter = strengthRank(context.world, player.clubId, player.id) <= KEY_PLAYERS;
  if (!starter || isSurplus(context, player, cache)) return true;
  return (
    reputationOf(context, buyerId) >= reputationOf(context, player.clubId) + rules.upwardMargin
  );
}

/** Preço pedido a um clube da IA: a pedida da 010, com desconto para excedentes. */
export function aiAskingPrice(
  context: MarketContext,
  player: CompletedPlayer,
  cache?: NeedsCache,
): number {
  const ask = askingPrice(context, player);
  if (!isSurplus(context, player, cache)) return ask;
  const rules = aiMarketRules(context.world, context.league.competitionId);
  return Math.max(1000, Math.round((ask * rules.surplusDiscountPct) / 100 / 1000) * 1000);
}
