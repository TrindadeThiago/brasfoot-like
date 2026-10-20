import {
  answerClubCounter,
  answerIncomingOffer,
  answerPlayerDemand,
  cancelNegotiation,
  type IncomingAnswer,
  type MarketContext,
  type MarketError,
  type MarketUpdate,
  marketAfterRound,
  type NegotiationStep,
  proposeContract,
  type StartInput,
  startNegotiation,
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
    managerClubId: save.clubId,
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
