import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { ensureContracts } from "../../src/market/contracts";
import type { CompletedBank } from "../../src/model/types";
import { isRegional, isRegionalOnly } from "../../src/regional/scope";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateRegionalBank, type RegionalBankOptions } from "../../src/worldgen/regional";
import { ok } from "./qualification-helpers";
import { worldState } from "./world-helpers";

export const REGIONAL_SEED = "estaduais-carreira";

/** Banco com estaduais, pronto para a carreira (atributos ocultos e contratos). */
export function regionalWorld(
  options: Partial<RegionalBankOptions> = {},
  seed: string = REGIONAL_SEED,
): CompletedBank {
  const bank = generateRegionalBank({ seed, states: 3, ...options });
  const completed = completeHiddenAttributes(bank, seed);
  return ensureContracts(completed, Number(completed.manifest.referenceDate.slice(0, 4)), seed);
}

/** Primeiro clube que joga a liga nacional (e, portanto, o estadual da região dele). */
export function nationalManager(world: CompletedBank): string {
  const club = world.clubs.find((entry) => !isRegionalOnly(world, entry.id));
  if (!club) throw new Error("sem clube nacional");
  return club.id;
}

export function regionalState(
  options: { seed?: string; world?: CompletedBank; manager?: string } = {},
): { state: CareerSeasonState; manager: string; seed: string; world: CompletedBank } {
  const seed = options.seed ?? REGIONAL_SEED;
  const world = options.world ?? regionalWorld({}, seed);
  const manager = options.manager ?? nationalManager(world);
  return { state: worldState(world, seed, manager), manager, seed, world };
}

export function regionalSeasons(
  state: Pick<CareerSeasonState, "league" | "competitions" | "world">,
) {
  return [state.league, ...state.competitions].filter((league) => {
    const competition = state.world.competitions.find((entry) => entry.id === league.competitionId);
    return competition !== undefined && isRegional(competition);
  });
}

export function playToEnd(
  state: CareerSeasonState,
  seed: string,
  manager: string,
): CareerSeasonState {
  return ok(advanceCareerDays(state, { toEnd: true }, seed, manager)).state;
}
