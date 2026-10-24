import { type CreateBoardManager, createBoard, extendBoard } from "../board/create";
import type { BoardState } from "../board/types";
import type { LeagueSeason } from "../career/types";
import { createFans } from "../fans/create";
import type { FansState } from "../fans/types";
import { createFinances } from "../finance/create";
import type { FinanceState } from "../finance/types";
import type { CompletedBank } from "../model/types";
import { isCountryMain } from "./countries";

/** As ligas principais da carreira: a em foco primeiro e as dos outros países na ordem do banco. */
export function worldLeagues(
  world: CompletedBank,
  state: { league: LeagueSeason; competitions: readonly LeagueSeason[] },
): LeagueSeason[] {
  return [
    state.league,
    ...state.competitions.filter((entry) => isCountryMain(world, entry.competitionId)),
  ];
}

/**
 * Finanças, torcidas e diretorias iniciais de todas as ligas principais (020 R6). Com um país só é
 * exatamente o que `createFinances`, `createFans` e `createBoard` fazem para a liga em foco.
 */
export function createWorldSystems(
  world: CompletedBank,
  state: { league: LeagueSeason; competitions: readonly LeagueSeason[] },
  careerSeed: string,
  manager?: CreateBoardManager,
): { finances: FinanceState; fans: FansState; board: BoardState } {
  const leagues = worldLeagues(world, state);
  const [focus, ...others] = leagues;
  if (!focus) throw new Error("carreira sem liga");
  let finances = createFinances(world, focus);
  const fans: FansState = { clubs: { ...createFans(world, focus).clubs } };
  for (const league of others) {
    const extra = createFinances(world, league);
    finances = {
      clubs: { ...finances.clubs, ...extra.clubs },
      ledger: [...finances.ledger, ...extra.ledger],
      gates: [...finances.gates, ...extra.gates],
      seasons: finances.seasons,
      crises: finances.crises,
    };
    Object.assign(fans.clubs, createFans(world, league).clubs);
  }
  let board = createBoard(world, focus, finances, careerSeed, manager);
  for (const league of others) board = extendBoard(board, world, league, finances, careerSeed);
  return { finances, fans, board };
}
