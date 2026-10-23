import {
  answerClubCounter,
  answerIncomingOffer,
  answerPlayerDemand,
  cancelNegotiation,
  type IncomingAnswer,
  type MarketContext,
  type MarketError,
  type MarketUpdate,
  managerClubOf,
  marketAfterRound,
  type NegotiationStep,
  proposeContract,
  quoteSale,
  quoteTermination,
  type SaleQuote,
  type StartInput,
  sellNow,
  startNegotiation,
  type TerminationQuote,
  terminateContract,
} from "@brasfoot-like/engine";
import { withAdjustedLineup } from "./career";
import type { SaveFile } from "./format";

export type MarketSaveResult =
  | { ok: true; save: SaveFile; step: NegotiationStep }
  | { ok: false; error: MarketError };

/** Contexto do motor para as ações do mercado do clube do jogador. */
export function marketContextOf(save: SaveFile): MarketContext {
  return {
    world: save.bank,
    league: save.league,
    finances: save.finances,
    market: save.market,
    managerClubId: managerClubOf(save.board),
    careerSeed: save.seed,
  };
}

/** Grava o resultado no save; quem saiu do clube sai também da escalação (com aviso). */
export function applyMarketUpdate(save: SaveFile, update: MarketUpdate): SaveFile {
  const next: SaveFile = {
    ...save,
    bank: update.world,
    finances: update.finances,
    market: update.market,
  };
  return update.departed.length > 0 ? withAdjustedLineup(next) : next;
}

function applyStep(
  save: SaveFile,
  result: { ok: true; value: NegotiationStep } | { ok: false; error: MarketError },
): MarketSaveResult {
  if (!result.ok) return result;
  return { ok: true, save: applyMarketUpdate(save, result.value.update), step: result.value };
}

export function startManagerNegotiation(save: SaveFile, input: StartInput): MarketSaveResult {
  return applyStep(save, startNegotiation(marketContextOf(save), input));
}

export function answerManagerClubCounter(
  save: SaveFile,
  negotiationId: string,
  accept: boolean,
): MarketSaveResult {
  return applyStep(save, answerClubCounter(marketContextOf(save), negotiationId, accept));
}

export function proposeManagerContract(
  save: SaveFile,
  negotiationId: string,
  offer: { wage: number; years: number },
): MarketSaveResult {
  return applyStep(save, proposeContract(marketContextOf(save), negotiationId, offer));
}

export function answerManagerPlayerDemand(
  save: SaveFile,
  negotiationId: string,
  accept: boolean,
): MarketSaveResult {
  return applyStep(save, answerPlayerDemand(marketContextOf(save), negotiationId, accept));
}

export function cancelManagerNegotiation(save: SaveFile, negotiationId: string): SaveFile {
  return applyMarketUpdate(save, cancelNegotiation(marketContextOf(save), negotiationId));
}

/** Depois de cada rodada fechada: propostas da IA e expirações (R10). */
export function marketAfterRoundOf(save: SaveFile): SaveFile {
  return applyMarketUpdate(save, marketAfterRound(marketContextOf(save)));
}

export type IncomingSaveResult =
  | { ok: true; save: SaveFile; response?: "accepted" | "refused" }
  | { ok: false; error: MarketError };

export function answerManagerIncomingOffer(
  save: SaveFile,
  offerId: string,
  answer: IncomingAnswer,
): IncomingSaveResult {
  const result = answerIncomingOffer(marketContextOf(save), offerId, answer);
  if (!result.ok) return result;
  return {
    ok: true,
    save: applyMarketUpdate(save, result.value.update),
    ...(result.value.response ? { response: result.value.response } : {}),
  };
}

/** Some com o aviso do último resumo de janela (011 R10). */
export function dismissWindowReport(save: SaveFile): SaveFile {
  const last = save.market.reports.at(-1);
  if (!last || save.market.reportSeen === last.id) return save;
  return { ...save, market: { ...save.market, reportSeen: last.id } };
}

export type DisposalSaveResult = { ok: true; save: SaveFile } | { ok: false; error: MarketError };

/** Cotação da venda imediata de um jogador do clube (a que `sellManagerPlayer` executa). */
export function quoteManagerSale(
  save: SaveFile,
  playerId: string,
): { ok: true; quote: SaleQuote } | { ok: false; error: MarketError } {
  const result = quoteSale(marketContextOf(save), playerId);
  return result.ok ? { ok: true, quote: result.value } : result;
}

/** Cotação da rescisão de um jogador do clube (a que `terminateManagerContract` executa). */
export function quoteManagerTermination(
  save: SaveFile,
  playerId: string,
): { ok: true; quote: TerminationQuote } | { ok: false; error: MarketError } {
  const result = quoteTermination(marketContextOf(save), playerId);
  return result.ok ? { ok: true, quote: result.value } : result;
}

/** Vende o jogador na hora; quem sai também sai da escalação (com aviso). */
export function sellManagerPlayer(save: SaveFile, playerId: string): DisposalSaveResult {
  const result = sellNow(marketContextOf(save), playerId);
  return result.ok ? { ok: true, save: applyMarketUpdate(save, result.value) } : result;
}

/** Rescinde o contrato, pagando a multa; o jogador vira livre. */
export function terminateManagerContract(save: SaveFile, playerId: string): DisposalSaveResult {
  const result = terminateContract(marketContextOf(save), playerId);
  return result.ok ? { ok: true, save: applyMarketUpdate(save, result.value) } : result;
}
