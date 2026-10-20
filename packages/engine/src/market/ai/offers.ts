import type { Rng } from "../../rng/xoshiro";
import { marketRules } from "../rules";
import { canAddPlayer, canRemovePlayer, strengthRank } from "../squad";
import type { IncomingOffer, MarketContext } from "../types";
import { marketValue } from "../value";
import { clubNeeds } from "./needs";
import { aiMarketRules } from "./rules";

const STARTERS = 11;
/** Parte das propostas que é por empréstimo (%), para jogadores fora dos titulares. */
const LOAN_SHARE_PCT = 25;

function roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

/**
 * Proposta de um clube da IA por um jogador do humano (011 R9): só de quem tem a posição
 * descoberta ou fraca, ganharia força com ele e tem orçamento para a oferta.
 */
export function incomingOfferFor(
  context: MarketContext,
  rng: Rng,
  blocked: ReadonlySet<string> = new Set(),
): Omit<IncomingOffer, "id" | "expiresRound"> | undefined {
  const rules = marketRules(context.world, context.league.competitionId);
  const ai = aiMarketRules(context.world, context.league.competitionId);
  const year = context.league.year;
  const own = context.world.players
    .filter(
      (player) =>
        player.clubId === context.managerClubId &&
        !player.contract?.loan &&
        !blocked.has(player.id) &&
        canRemovePlayer(context.world, context.managerClubId, player.id),
    )
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const buyers = context.league.divisions
    .flatMap((season) => season.clubIds)
    .filter((clubId) => clubId !== context.managerClubId)
    .sort();
  const pairs: { playerId: string; fromClubId: string; budget: number }[] = [];
  for (const clubId of buyers) {
    const needs = clubNeeds(context, clubId);
    if (needs.budget <= 0) continue;
    for (const player of own) {
      if (!needs.priorities.includes(player.position)) continue;
      const need = needs.positions[player.position];
      if (!need.uncovered && player.strength - need.starter < ai.minGain) continue;
      if (!canAddPlayer(context.world, clubId, player.position)) continue;
      pairs.push({ playerId: player.id, fromClubId: clubId, budget: needs.budget });
    }
  }
  while (pairs.length > 0) {
    const pair = pairs.splice(rng.int(0, pairs.length - 1), 1)[0];
    if (!pair) break;
    const player = own.find((entry) => entry.id === pair.playerId);
    if (!player) continue;
    const value = marketValue(player, context.world, year);
    const asLoan =
      strengthRank(context.world, context.managerClubId, player.id) > STARTERS &&
      rng.int(1, 100) <= LOAN_SHARE_PCT;
    const fee = asLoan
      ? roundThousand((value * rules.club.loanFeePct) / 100)
      : roundThousand((value * rng.int(rules.incoming.minPct, rules.incoming.maxPct)) / 100);
    if (fee > pair.budget) continue;
    return {
      playerId: pair.playerId,
      fromClubId: pair.fromClubId,
      fee,
      kind: asLoan ? "loan" : "buy",
    };
  }
  return undefined;
}
