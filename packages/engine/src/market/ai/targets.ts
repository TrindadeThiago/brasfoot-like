import { ageOn, seasonDate } from "../../calendar/date";
import type { Position } from "../../model/catalogs";
import type { CompletedPlayer } from "../../model/types";
import { attraction, exigency, respondToContract, wageDemand } from "../player-response";
import { marketRules } from "../rules";
import { canAddPlayer } from "../squad";
import type { MarketContext } from "../types";
import type { ClubNeeds } from "./needs";
import { aiMarketRules } from "./rules";
import { aiAskingPrice, type NeedsCache, sellerAccepts } from "./seller";

/** Idade a partir da qual não há mais bônus de juventude. */
const YOUTH_PIVOT = 26;

export interface PurchasePlan {
  player: CompletedPlayer;
  fee: number;
  wage: number;
  score: number;
}

/**
 * Melhor alvo de compra para a posição (011 R4): melhora o titular provável, cabe no orçamento
 * (taxa + um ano de salário), o atleta aceita o clube e o vendedor aceita vender. Ganho de força
 * pesa mais que o custo para quem tem orçamento grande — por isso os grandes ficam com os melhores.
 */
export function purchaseTarget(
  context: MarketContext,
  needs: ClubNeeds,
  position: Position,
  excluded: ReadonlySet<string> = new Set(),
  cache?: NeedsCache,
): PurchasePlan | undefined {
  const rules = aiMarketRules(context.world, context.league.competitionId);
  const buyer = needs.clubId;
  if (needs.budget <= 0 || !canAddPlayer(context.world, buyer, position, context.managerClubId))
    return undefined;
  const need = needs.positions[position];
  const date = seasonDate(context.world.manifest.referenceDate, context.league.year);
  const negotiating = new Set(context.market.negotiations.map((entry) => entry.playerId));
  const appeal = attraction(context, buyer);
  const margin = marketRules(context.world, context.league.competitionId).player.interestMargin;
  let best: PurchasePlan | undefined;
  for (const player of context.world.players) {
    if (player.position !== position || player.clubId === buyer) continue;
    if (player.clubId === context.managerClubId || player.contract?.loan) continue;
    if (excluded.has(player.id) || negotiating.has(player.id)) continue;
    const gain = player.strength - need.starter;
    if (!need.uncovered && gain < rules.minGain) continue;
    if (appeal < exigency(player) - margin) continue;
    const wage = wageDemand(context, player, buyer);
    if (respondToContract(context, player, buyer, wage).kind !== "accepted") continue;
    const fee = aiAskingPrice(context, player, cache);
    const cost = fee + 12 * wage;
    if (cost > needs.budget) continue;
    if (!sellerAccepts(context, player, buyer, cache)) continue;
    const years = Math.max(0, YOUTH_PIVOT - ageOn(player.birthDate, date));
    const youth = (rules.youthBonus * years * (needs.old ? 2 : 1)) / 10;
    const score = gain + youth - (2 * cost) / needs.budget;
    if (!best || score > best.score || (score === best.score && player.id < best.player.id)) {
      best = { player, fee, wage, score };
    }
  }
  return best;
}
