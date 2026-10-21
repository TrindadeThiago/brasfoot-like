import { createBoard } from "../../src/board/create";
import type { BoardState } from "../../src/board/types";
import { advanceCareer } from "../../src/career/day";
import type { LeagueSeason } from "../../src/career/types";
import { createFans } from "../../src/fans/create";
import type { FansState } from "../../src/fans/types";
import { createFinances } from "../../src/finance/create";
import type { FinanceState } from "../../src/finance/types";
import { emptyMarket, type MarketState } from "../../src/market/types";
import type { CompletedBank, Rivalry } from "../../src/model/types";
import { contractWorld, newLeague } from "../market/helpers";

export const SEED = "torcida";
export const MANAGER = "clube-001";

export interface FansCareer {
  world: CompletedBank;
  league: LeagueSeason;
  finances: FinanceState;
  market: MarketState;
  board: BoardState;
  fans: FansState;
  careerSeed: string;
}

/** Carreira nova com torcida e diretoria; `rivalries` substitui as rivalidades do mundo. */
export function fansCareer(options: { rivalries?: Rivalry[]; seed?: string } = {}): FansCareer {
  const seed = options.seed ?? SEED;
  const base = contractWorld();
  const world: CompletedBank =
    options.rivalries === undefined ? base : { ...base, rivalries: options.rivalries };
  const league = newLeague(seed, {}, world);
  const finances = createFinances(world, league);
  return {
    world,
    league,
    finances,
    market: emptyMarket(),
    board: createBoard(world, league, finances, seed, { clubId: MANAGER, noFiring: true }),
    fans: createFans(world, league),
    careerSeed: seed,
  };
}

/** Avança pelo caminho da carreira com mercado, diretoria e torcida. */
export function playFans(career: FansCareer, step: { rounds: number } | { toEnd: true }) {
  const result = advanceCareer(
    career.league,
    career.finances,
    career.world,
    step,
    MANAGER,
    undefined,
    undefined,
    { state: career.market, careerSeed: career.careerSeed },
    { state: career.board, careerSeed: career.careerSeed },
    { state: career.fans },
  );
  if (!result.ok || !result.fans || !result.board || !result.market) {
    throw new Error(JSON.stringify(result));
  }
  return {
    ...career,
    league: result.league,
    finances: result.finances,
    world: result.world,
    market: result.market,
    board: result.board,
    fans: result.fans,
  };
}

/** Opponent of the club in the round. */
export function opponentIn(career: Pick<FansCareer, "league">, clubId: string, round: number) {
  for (const season of career.league.divisions) {
    const fixture = season.calendar[round - 1]?.fixtures.find(
      (entry) => entry.home === clubId || entry.away === clubId,
    );
    if (fixture) return fixture.home === clubId ? fixture.away : fixture.home;
  }
  throw new Error("sem jogo");
}

/** Reescreve o placar do jogo do clube na rodada. */
export function withScore<T extends Pick<FansCareer, "league">>(
  career: T,
  clubId: string,
  round: number,
  own: number,
  other: number,
): T {
  const league = structuredClone(career.league);
  for (const season of league.divisions) {
    for (const record of season.records) {
      if (record.round !== round) continue;
      if (record.home === clubId) record.score = { home: own, away: other };
      if (record.away === clubId) record.score = { home: other, away: own };
    }
  }
  return { ...career, league };
}

export function withMood<T extends Pick<FansCareer, "fans">>(
  career: T,
  clubId: string,
  mood: number,
): T {
  const fans = structuredClone(career.fans);
  const club = fans.clubs[clubId];
  if (club) club.mood = mood;
  return { ...career, fans };
}
