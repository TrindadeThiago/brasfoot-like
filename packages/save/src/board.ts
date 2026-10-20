import {
  acceptJobOffer,
  type BoardContext,
  type BoardError,
  clubDivision,
  createRng,
  declineJobOffer,
  managerClubOf,
} from "@brasfoot-like/engine";
import { withManagerFormation } from "./career";
import type { SaveFile } from "./format";
import { initialLineup } from "./lineup";

/** Clube do técnico para as chamadas do motor: `""` quando desempregado (012 R3). */
export function managedClubId(save: SaveFile): string {
  return managerClubOf(save.board);
}

export function isEmployed(save: SaveFile): boolean {
  return save.board.manager.clubId !== null;
}

/** Contexto do motor para as consultas da diretoria (metas, andamento). */
export function boardContextOf(save: SaveFile): BoardContext {
  return {
    world: save.bank,
    league: save.league,
    finances: save.finances,
    board: save.board,
    careerSeed: save.seed,
  };
}

export type BoardSaveResult = { ok: true; save: SaveFile } | { ok: false; error: BoardError };

/**
 * Aceita a proposta de emprego (012 FR-027): o clube em foco passa a ser o novo, com escalação
 * automática nova; o clube deixado passa à IA e o mercado dele é liberado.
 */
export function acceptManagerOffer(save: SaveFile, offerId: string): BoardSaveResult {
  const result = acceptJobOffer(
    {
      world: save.bank,
      league: save.league,
      finances: save.finances,
      board: save.board,
      market: save.market,
      careerSeed: save.seed,
    },
    offerId,
    createRng(`${save.seed}:board:accept:${offerId}`),
  );
  if (!result.ok) return result;
  const clubId = result.board.manager.clubId ?? save.clubId;
  const season = clubDivision(save.league, clubId);
  if (!season) return { ok: false, error: { code: "board.offer_not_found", params: { offerId } } };
  const { lineupNotice: _notice, ...rest } = save;
  return {
    ok: true,
    save: withManagerFormation({
      ...rest,
      clubId,
      board: result.board,
      market: result.market,
      lineup: initialLineup(save.bank, season, clubId),
    }),
  };
}

export function declineManagerOffer(save: SaveFile, offerId: string): SaveFile {
  const board = declineJobOffer(save.board, offerId);
  return board === save.board ? save : { ...save, board };
}

/** Some com o aviso de demissão/contratação da Início. */
export function dismissBoardNotice(save: SaveFile): SaveFile {
  if (!save.board.notice) return save;
  const { notice: _notice, ...board } = save.board;
  return { ...save, board };
}
