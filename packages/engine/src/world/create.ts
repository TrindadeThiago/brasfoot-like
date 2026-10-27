import { withContinentalGoals } from "../board/continental";
import { type CreateBoardManager, createBoard, extendBoard } from "../board/create";
import { withRegionalGoals } from "../board/regional";
import type { BoardState } from "../board/types";
import type { LeagueSeason } from "../career/types";
import { createFans } from "../fans/create";
import type { FansState } from "../fans/types";
import { createFinances } from "../finance/create";
import type { FinanceState } from "../finance/types";
import type { CompletedBank } from "../model/types";
import { isRegional } from "../regional/scope";
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
 * Clubes só regionais (023 R4) não estão em nenhuma liga principal: as finanças, a torcida e a
 * diretoria deles nascem do estadual. Devolve os estaduais reduzidos aos clubes ainda não cobertos
 * pelas ligas principais, ou nada se o mundo não tem estadual.
 */
export function regionalOnlyLeagues(
  world: CompletedBank,
  state: { league: LeagueSeason; competitions: readonly LeagueSeason[] },
): LeagueSeason[] {
  const covered = new Set(
    worldLeagues(world, state).flatMap((league) =>
      league.divisions.flatMap((season) => season.clubIds),
    ),
  );
  const leagues: LeagueSeason[] = [];
  for (const league of state.competitions) {
    const competition = world.competitions.find((entry) => entry.id === league.competitionId);
    if (!competition || !isRegional(competition)) continue;
    const divisions = league.divisions
      .map((season) => ({ ...season, clubIds: season.clubIds.filter((id) => !covered.has(id)) }))
      .filter((season) => season.clubIds.length > 0);
    for (const season of divisions) for (const id of season.clubIds) covered.add(id);
    if (divisions.length > 0) leagues.push({ ...league, divisions });
  }
  return leagues;
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
  const regional = regionalOnlyLeagues(world, state);
  for (const league of regional) {
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
  for (const league of [...others, ...regional]) {
    board = extendBoard(board, world, league, finances, careerSeed);
  }
  board = withContinentalGoals(board, world, [state.league, ...state.competitions]);
  board = withRegionalGoals(board, world, [state.league, ...state.competitions]);
  return { finances, fans, board };
}
