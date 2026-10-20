import { draft, post } from "../finance/ledger";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { canAddPlayer, canRemovePlayer } from "./squad";
import type {
  Contract,
  FreeAgent,
  MarketContext,
  MarketResult,
  MarketState,
  MarketUpdate,
  TransferRecord,
} from "./types";
import { fail } from "./types";
import { roundsPlayed } from "./windows";

/** Estado de partida de qualquer efeito: cópias rasas que podem ser alteradas à vontade. */
function working(context: MarketContext): MarketUpdate {
  return {
    world: { ...context.world, players: [...context.world.players] },
    finances: draft(context.finances),
    market: {
      ...context.market,
      freeAgents: [...context.market.freeAgents],
      negotiations: [...context.market.negotiations],
      incoming: [...context.market.incoming],
      log: [...context.market.log],
    },
    departed: [],
  };
}

function replacePlayer(world: CompletedBank, player: CompletedPlayer): void {
  const index = world.players.findIndex((entry) => entry.id === player.id);
  if (index >= 0) world.players[index] = player;
}

function record(context: MarketContext, entry: Omit<TransferRecord, "season" | "round">) {
  return { season: context.league.number, round: roundsPlayed(context.league), ...entry };
}

/** Lança a taxa: despesa do comprador e receita do vendedor, sem criar dinheiro (R9). */
function postFee(
  context: MarketContext,
  update: MarketUpdate,
  fee: number,
  buyerId: string,
  sellerId: string,
): void {
  const base = { season: context.league.number, round: roundsPlayed(context.league) };
  post(update.finances, { clubId: buyerId, ...base, category: "transfer_purchase", amount: -fee });
  post(update.finances, { clubId: sellerId, ...base, category: "transfer_sale", amount: fee });
}

/** Valida caixa e elencos antes de mover jogador e dinheiro. */
function checkTransfer(
  context: MarketContext,
  player: CompletedPlayer,
  buyerId: string,
  fee: number,
): MarketResult<never> | undefined {
  if ((context.finances.clubs[buyerId]?.cash ?? 0) < fee) {
    return fail("market.insufficient_cash", { needed: fee });
  }
  if (!canAddPlayer(context.world, buyerId, player.position)) return fail("market.squad_full");
  if (!canRemovePlayer(context.world, player.clubId, player.id)) {
    return fail("market.squad_minimum");
  }
  return undefined;
}

/**
 * Transferência definitiva (compra do usuário ou venda a clube da IA): move o jogador, lança a taxa
 * nos dois caixas (soma inalterada, SC-004) e respeita os limites de elenco (SC-005). Sem
 * `contract`, o jogador leva o contrato atual.
 */
export function completeTransfer(
  context: MarketContext,
  input: { playerId: string; toClubId: string; fee: number; contract?: Contract },
): MarketResult<MarketUpdate> {
  const player = context.world.players.find((entry) => entry.id === input.playerId);
  if (!player?.contract) return fail("market.not_found");
  const problem = checkTransfer(context, player, input.toClubId, input.fee);
  if (problem) return problem;
  const fromClubId = player.clubId;
  const update = working(context);
  const contract = input.contract ?? {
    wage: player.contract.wage,
    untilYear: player.contract.untilYear,
  };
  replacePlayer(update.world, { ...player, clubId: input.toClubId, contract });
  postFee(context, update, input.fee, input.toClubId, fromClubId);
  if (fromClubId === context.managerClubId) update.departed.push(player.id);
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: input.toClubId === context.managerClubId ? "buy" : "sale",
      fromClubId,
      toClubId: input.toClubId,
      fee: input.fee,
      wage: contract.wage,
      untilYear: contract.untilYear,
    }),
  );
  return { ok: true, value: update };
}

/** Empréstimo até o fim da temporada: o clube que recebe paga o salário (FR-018). */
export function completeLoan(
  context: MarketContext,
  input: { playerId: string; toClubId: string; fee: number },
): MarketResult<MarketUpdate> {
  const player = context.world.players.find((entry) => entry.id === input.playerId);
  if (!player?.contract) return fail("market.not_found");
  if (player.contract.loan) return fail("market.player_on_loan");
  const problem = checkTransfer(context, player, input.toClubId, input.fee);
  if (problem) return problem;
  const fromClubId = player.clubId;
  const update = working(context);
  const contract: Contract = {
    ...player.contract,
    loan: { fromClubId, untilYear: context.league.year },
  };
  replacePlayer(update.world, { ...player, clubId: input.toClubId, contract });
  postFee(context, update, input.fee, input.toClubId, fromClubId);
  if (fromClubId === context.managerClubId) update.departed.push(player.id);
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: input.toClubId === context.managerClubId ? "loan" : "loan_out",
      fromClubId,
      toClubId: input.toClubId,
      fee: input.fee,
      wage: contract.wage,
      untilYear: context.league.year,
    }),
  );
  return { ok: true, value: update };
}

/** Contratação de livre: entra no banco com clube e contrato (US7). */
export function completeSigning(
  context: MarketContext,
  input: { agent: FreeAgent; clubId: string; contract: Contract },
): MarketResult<MarketUpdate> {
  if (!canAddPlayer(context.world, input.clubId, input.agent.player.position)) {
    return fail("market.squad_full");
  }
  const update = working(context);
  const player = {
    ...input.agent.player,
    clubId: input.clubId,
    contract: input.contract,
  } as CompletedPlayer;
  update.world.players.push(player);
  update.market.freeAgents = update.market.freeAgents.filter(
    (entry) => entry.player.id !== player.id,
  );
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: "free",
      toClubId: input.clubId,
      fee: 0,
      wage: input.contract.wage,
      untilYear: input.contract.untilYear,
    }),
  );
  return { ok: true, value: update };
}

/** Renovação: só muda o contrato (US6). */
export function completeRenewal(
  context: MarketContext,
  input: { playerId: string; contract: Contract },
): MarketResult<MarketUpdate> {
  const player = context.world.players.find((entry) => entry.id === input.playerId);
  if (!player) return fail("market.not_found");
  const update = working(context);
  replacePlayer(update.world, { ...player, contract: input.contract });
  update.market.log.push(
    record(context, {
      playerId: player.id,
      displayName: player.displayName,
      kind: "renew",
      toClubId: player.clubId,
      fee: 0,
      wage: input.contract.wage,
      untilYear: input.contract.untilYear,
    }),
  );
  return { ok: true, value: update };
}

export type { MarketState };
