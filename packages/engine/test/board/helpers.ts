import { createBoard } from "../../src/board/create";
import type { BoardContext, BoardState } from "../../src/board/types";
import type { LeagueSeason } from "../../src/career/types";
import { createFinances } from "../../src/finance/create";
import { advanceCareer } from "../../src/finance/round";
import type { FinanceState } from "../../src/finance/types";
import { emptyMarket, type MarketState } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import { contractWorld, newLeague } from "../market/helpers";

export const SEED = "diretoria";
export const MANAGER = "clube-001";

export interface Career extends BoardContext {
  market: MarketState;
}

/** Carreira nova com diretoria (rodada 0). */
export function newCareer(
  options: {
    world?: CompletedBank;
    managerClubId?: string | null;
    noFiring?: boolean;
    reputation?: number;
    seed?: string;
  } = {},
): Career {
  const seed = options.seed ?? SEED;
  const world = options.world ?? contractWorld();
  const league: LeagueSeason = newLeague(seed, {}, world);
  const finances: FinanceState = createFinances(world, league);
  const managerClubId = options.managerClubId === undefined ? MANAGER : options.managerClubId;
  const board: BoardState = createBoard(
    world,
    league,
    finances,
    seed,
    managerClubId === null
      ? undefined
      : {
          clubId: managerClubId,
          noFiring: options.noFiring ?? false,
          ...(options.reputation !== undefined ? { reputation: options.reputation } : {}),
        },
  );
  return { world, league, finances, board, careerSeed: seed, market: emptyMarket() };
}

/** Avança `rounds` rodadas (ou até o fim) pelo caminho da carreira, com mercado e diretoria. */
export function play(career: Career, step: { rounds: number } | { toEnd: true }): Career {
  const result = advanceCareer(
    career.league,
    career.finances,
    career.world,
    step,
    career.board.manager.clubId ?? "",
    undefined,
    undefined,
    { state: career.market, careerSeed: career.careerSeed },
    { state: career.board, careerSeed: career.careerSeed },
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  if (!result.board || !result.market) throw new Error("sem diretoria/mercado");
  return {
    ...career,
    league: result.league,
    finances: result.finances,
    world: result.world,
    board: result.board,
    market: result.market,
  };
}

/** Clubes de uma divisão da liga. */
export function divisionClubs(career: Pick<Career, "league">, level = 1): string[] {
  const season = career.league.divisions.find((entry) => entry.divisionLevel === level);
  if (!season) throw new Error(`sem divisão ${level}`);
  return [...season.clubIds];
}

export { initialRenewal };
