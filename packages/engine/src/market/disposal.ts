import { isLeagueSeasonOver } from "../career/league";
import { draft, post } from "../finance/ledger";
import type { CompletedPlayer } from "../model/types";
import { clubNeeds } from "./ai/needs";
import { completeTransfer } from "./effects";
import { toFreeAgent } from "./free-agents";
import { marketRules, QUICK_SALE_PCT } from "./rules";
import { canAddPlayer, canRemovePlayer } from "./squad";
import type { FreeAgent, MarketContext, MarketResult, MarketUpdate } from "./types";
import { fail } from "./types";
import { marketValue } from "./value";
import { isWindowOpen, roundsPlayed } from "./windows";

export { QUICK_SALE_PCT };
/** Rescisão: o clube paga esta parte do salário que ainda deveria ao jogador. */
export const TERMINATION_PCT = 50;

export interface SaleQuote {
  playerId: string;
  buyerClubId: string;
  fee: number;
  /** Valor de mercado de referência. */
  value: number;
}

export interface TerminationQuote {
  playerId: string;
  /** Multa paga ao jogador, que sai como livre. */
  penalty: number;
  /** Meses de contrato que ainda restavam. */
  monthsLeft: number;
  /** Salário mensal que o clube deixa de pagar. */
  wage: number;
}

function ownPlayer(context: MarketContext, playerId: string): CompletedPlayer | undefined {
  const player = context.world.players.find((entry) => entry.id === playerId);
  return player?.clubId === context.managerClubId ? player : undefined;
}

function roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000;
}

/**
 * Cotação da venda imediata (janela aberta): o preço é uma parte fixa do valor de mercado e o
 * comprador é um clube da IA que cabe o jogador e tem orçamento; entre eles, quem mais precisa da
 * posição e depois quem tem mais orçamento. Determinística: a cotação mostrada é a que se executa.
 */
export function quoteSale(context: MarketContext, playerId: string): MarketResult<SaleQuote> {
  const player = ownPlayer(context, playerId);
  if (!player?.contract) return fail("market.not_found");
  if (player.contract.loan) return fail("market.player_on_loan");
  const rules = marketRules(context.world, context.league.competitionId);
  if (!isWindowOpen(context.league, rules)) return fail("market.window_closed", { round: 0 });
  if (!canRemovePlayer(context.world, context.managerClubId, player.id)) {
    return fail("market.squad_minimum");
  }
  const value = marketValue(player, context.world, context.league.year);
  const fee = roundThousand((value * QUICK_SALE_PCT) / 100);
  const buyers = context.league.divisions
    .flatMap((season) => season.clubIds)
    .filter((clubId) => clubId !== context.managerClubId)
    .sort()
    .filter((clubId) => canAddPlayer(context.world, clubId, player.position, context.managerClubId))
    .map((clubId) => ({ clubId, needs: clubNeeds(context, clubId) }))
    .filter(({ needs }) => needs.budget >= fee)
    .sort(
      (a, b) =>
        Number(b.needs.priorities.includes(player.position)) -
          Number(a.needs.priorities.includes(player.position)) ||
        b.needs.budget - a.needs.budget ||
        (a.clubId < b.clubId ? -1 : 1),
    );
  const buyer = buyers[0];
  if (!buyer) return fail("market.no_buyer");
  return { ok: true, value: { playerId, buyerClubId: buyer.clubId, fee, value } };
}

/** Vende o jogador na hora ao comprador da cotação; o dinheiro passa de um caixa ao outro. */
export function sellNow(context: MarketContext, playerId: string): MarketResult<MarketUpdate> {
  const quote = quoteSale(context, playerId);
  if (!quote.ok) return quote;
  return completeTransfer(context, {
    playerId,
    toClubId: quote.value.buyerClubId,
    fee: quote.value.fee,
  });
}

/** Meses de contrato que ainda restam: anos inteiros depois do atual mais o que sobra da temporada. */
function monthsLeft(context: MarketContext, untilYear: number): number {
  const total = Math.max(...context.league.divisions.map((season) => season.calendar.length));
  const left = Math.max(0, total - roundsPlayed(context.league));
  const thisSeason = total === 0 ? 0 : Math.round((12 * left) / total);
  return 12 * Math.max(0, untilYear - context.league.year) + thisSeason;
}

/** Cotação da rescisão: multa sobre o salário que restava. Vale em qualquer época. */
export function quoteTermination(
  context: MarketContext,
  playerId: string,
): MarketResult<TerminationQuote> {
  const player = ownPlayer(context, playerId);
  if (!player?.contract) return fail("market.not_found");
  if (player.contract.loan) return fail("market.player_on_loan");
  // Depois da última rodada, antes da virada, a rescisão baixava a meta da próxima temporada
  // sem custo esportivo (auditoria v1.0.0, A9).
  if (isLeagueSeasonOver(context.league)) return fail("market.season_over");
  if (!canRemovePlayer(context.world, context.managerClubId, player.id)) {
    return fail("market.squad_minimum");
  }
  const months = monthsLeft(context, player.contract.untilYear);
  const penalty = roundThousand((player.contract.wage * months * TERMINATION_PCT) / 100);
  return {
    ok: true,
    value: { playerId, penalty, monthsLeft: months, wage: player.contract.wage },
  };
}

/**
 * Rescinde o contrato: o clube paga a multa (lançada em salários), o jogador sai do elenco e do
 * banco e passa a ser livre no mercado.
 */
export function terminateContract(
  context: MarketContext,
  playerId: string,
): MarketResult<MarketUpdate> {
  const quote = quoteTermination(context, playerId);
  if (!quote.ok) return quote;
  const { penalty } = quote.value;
  if ((context.finances.clubs[context.managerClubId]?.cash ?? 0) < penalty) {
    return fail("market.insufficient_cash", { needed: penalty });
  }
  const player = ownPlayer(context, playerId) as CompletedPlayer;
  const finances = draft(context.finances);
  post(finances, {
    clubId: context.managerClubId,
    season: context.league.number,
    round: roundsPlayed(context.league),
    category: "wages",
    amount: -penalty,
  });
  const agent: FreeAgent = {
    ...toFreeAgent(player, context.managerClubId, context.league.year),
    releasedByClub: true,
  };
  return {
    ok: true,
    value: {
      world: {
        ...context.world,
        players: context.world.players.filter((entry) => entry.id !== playerId),
      },
      finances,
      market: {
        ...context.market,
        freeAgents: [...context.market.freeAgents, agent].sort((a, b) =>
          a.player.id < b.player.id ? -1 : 1,
        ),
        incoming: context.market.incoming.filter((offer) => offer.playerId !== playerId),
        negotiations: context.market.negotiations.filter(
          (negotiation) => negotiation.playerId !== playerId,
        ),
        log: [
          ...context.market.log,
          {
            season: context.league.number,
            round: roundsPlayed(context.league),
            playerId,
            displayName: player.displayName,
            kind: "released",
            fromClubId: context.managerClubId,
            fee: penalty,
            reason: "termination",
          },
        ],
      },
      departed: [playerId],
    },
  };
}
