import type { CareerSeasonState } from "../../src/career/season-state";
import { createCareerSeason } from "../../src/career/season-state";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { createNews } from "../../src/news/create";
import { initialRenewal } from "../../src/renewal/measure";
import { createWorldSystems } from "../../src/world/create";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateWorldBank, type WorldBankOptions } from "../../src/worldgen/world-example";

export const WORLD_SEED = "mundo-carreira";

/** Banco de vários países, pronto para a carreira (atributos ocultos e contratos). */
export function worldBank(
  options: Partial<WorldBankOptions> = {},
  seed: string = WORLD_SEED,
): CompletedBank {
  const bank = generateWorldBank({
    seed,
    countries: 3,
    divisionsPerCountry: 2,
    clubsPerDivision: 10,
    ...options,
  });
  const completed = completeHiddenAttributes(bank, seed);
  return ensureContracts(completed, Number(completed.manifest.referenceDate.slice(0, 4)), seed);
}

/** Um clube do país `index` (o de maior id da divisão de cima), para ser o do técnico. */
export function clubOfCountry(world: CompletedBank, index: number): string {
  const country = world.countries[index];
  const club = world.clubs.find((entry) => entry.countryId === country?.id);
  if (!club) throw new Error(`país ${index} sem clubes`);
  return club.id;
}

/** Estado da temporada de um mundo com vários países no primeiro dia, com todos os sistemas. */
export function worldState(
  world: CompletedBank,
  careerSeed: string,
  managerClubId: string,
): CareerSeasonState {
  const seasons = createCareerSeason(world, { careerSeed, focusClubId: managerClubId });
  if (!seasons.ok) throw new Error(JSON.stringify(seasons.error));
  const systems = createWorldSystems(world, seasons, careerSeed, {
    clubId: managerClubId,
    noFiring: true,
  });
  return {
    ...seasons,
    world,
    finances: systems.finances,
    renewal: initialRenewal(world),
    market: emptyMarket(),
    board: systems.board,
    fans: systems.fans,
    news: createNews(),
  };
}
