import { ageOn, seasonDate } from "../../calendar/date";
import type { Position } from "../../model/catalogs";
import type { CompletedPlayer } from "../../model/types";
import { canSignForeign } from "../../world/foreign";
import { playersAt } from "../../world/squads";
import { attraction, exigency, respondToContract, wageDemand } from "../player-response";
import { marketRules } from "../rules";
import { canAddPlayer } from "../squad";
import type { MarketContext } from "../types";
import { marketValue } from "../value";
import type { ClubNeeds } from "./needs";
import { aiMarketRules } from "./rules";
import { aiAskingPrice, type NeedsCache, sellerAccepts } from "./seller";
import { internationalBuysInWindow } from "./window";

/** Idade a partir da qual não há mais bônus de juventude. */
const YOUTH_PIVOT = 26;

export interface PurchasePlan {
  player: CompletedPlayer;
  fee: number;
  wage: number;
  score: number;
}

/** Menor taxa que o vendedor pediria: o valor de mercado com o menor ruído e o maior desconto. */
function minimumFee(context: MarketContext, player: CompletedPlayer, floorPct: number): number {
  return (marketValue(player, context.world, context.league.year) * floorPct) / 100 - 1000;
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
  const clubRules = marketRules(context.world, context.league.competitionId);
  const margin = clubRules.player.interestMargin;
  const buyerCountry = context.world.clubs.find((club) => club.id === buyer)?.countryId;
  // Menor fração do valor que o vendedor pediria (menor ruído, menor importância, maior desconto).
  const floor =
    (clubRules.club.noiseMinPct *
      Math.min(100, clubRules.club.keyPlayerPct) *
      Math.min(100, rules.surplusDiscountPct)) /
    10_000;
  const foreignRoom = canSignForeign(context.world, buyer);
  const abroadFull = internationalBuysInWindow(context, buyer) >= rules.maxInternationalPerClub;
  const countries = abroadFull
    ? new Map(context.world.clubs.map((club) => [club.id, club.countryId]))
    : undefined;
  let best: PurchasePlan | undefined;
  for (const player of playersAt(context.world, position)) {
    if (player.clubId === buyer) continue;
    if (player.clubId === context.managerClubId || player.contract?.loan) continue;
    if (excluded.has(player.id) || negotiating.has(player.id)) continue;
    // Contratação internacional da IA: teto por clube e janela (020 R13).
    if (countries && countries.get(player.clubId) !== buyerCountry) continue;
    // Limite de estrangeiros do país do comprador (020 FR-002a).
    if (player.nationalityId !== buyerCountry && !foreignRoom) continue;
    const gain = player.strength - need.starter;
    // Do mais forte ao mais fraco: passado o ganho mínimo, os demais também ficam abaixo.
    if (!need.uncovered && gain < rules.minGain) break;
    if (appeal < exigency(player) - margin) continue;
    // Poda barata: a pedida não fica abaixo do valor com o menor ruído e o maior desconto.
    if (minimumFee(context, player, floor) > needs.budget) continue;
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
