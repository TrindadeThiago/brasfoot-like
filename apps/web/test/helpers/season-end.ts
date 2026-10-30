import { advanceCareer } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";

/** Joga a temporada inteira (sem demissão) e devolve o save na tela de fim de temporada. */
export function finishedSeason(save: SaveFile): SaveFile {
  const played = advanceCareer(
    save.league,
    save.finances,
    save.bank,
    { toEnd: true },
    save.clubId,
    undefined,
    undefined,
    { state: save.market, careerSeed: save.seed },
    {
      state: { ...save.board, manager: { ...save.board.manager, noFiring: true } },
      careerSeed: save.seed,
    },
  );
  if (!played.ok || !played.board) throw new Error("a temporada não terminou");
  return {
    ...save,
    league: played.league,
    finances: played.finances,
    bank: played.world,
    market: played.market ?? save.market,
    board: played.board,
  };
}
