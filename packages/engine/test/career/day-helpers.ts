import { createBoard } from "../../src/board/create";
import type { CareerSeasonState } from "../../src/career/season-state";
import { createCareerSeason } from "../../src/career/season-state";
import { createFans } from "../../src/fans/create";
import { createFinances } from "../../src/finance/create";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { createNews } from "../../src/news/create";
import { initialRenewal } from "../../src/renewal/measure";

export const MANAGER = "clube-001";

/** Ano da primeira temporada (o da data de referência do banco). */
export function seasonYear(world: CompletedBank): number {
  return Number(world.manifest.referenceDate.slice(0, 4));
}

/**
 * Estado da temporada por datas (017) no primeiro dia: liga principal, secundárias, calendário e
 * finanças; com `systems`, também renovação, mercado, diretoria, torcida e notícias.
 */
export function newState(
  base: CompletedBank,
  careerSeed: string,
  options: { systems?: boolean; manager?: string } = {},
): CareerSeasonState {
  const world = options.systems ? ensureContracts(base, seasonYear(base), careerSeed) : base;
  const seasons = createCareerSeason(world, { careerSeed });
  if (!seasons.ok) throw new Error(JSON.stringify(seasons.error));
  const finances = createFinances(world, seasons.league);
  const state: CareerSeasonState = { ...seasons, finances, world };
  if (!options.systems) return state;
  return {
    ...state,
    renewal: initialRenewal(world),
    market: emptyMarket(),
    board: createBoard(world, seasons.league, finances, careerSeed, {
      clubId: options.manager ?? MANAGER,
      noFiring: true,
    }),
    fans: createFans(world, seasons.league),
    news: createNews(),
  };
}
