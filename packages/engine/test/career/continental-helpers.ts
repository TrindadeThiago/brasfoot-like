import { advanceCareerDays, completeCareerDay } from "../../src/career/day";
import { type CareerSeasonState, isCalendarOver } from "../../src/career/season-state";
import type { Competition, CompletedBank } from "../../src/model/types";
import { standings } from "../../src/season/standings";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { allSeasons, ok } from "./qualification-helpers";
import { worldBank, worldState } from "./world-helpers";

export const CONTINENTAL_SEED = "continental-carreira";

/** Banco compacto: 5 países de uma divisão de 8 clubes, copa nacional e a taça continental. */
export function compactWorld(seed: string = CONTINENTAL_SEED) {
  return worldBank(
    {
      countries: 5,
      divisionsPerCountry: 1,
      clubsPerDivision: 8,
      cup: true,
      continental: "compact",
    },
    seed,
  );
}

/** Estado no primeiro dia com o técnico num clube que joga (ou não) a taça continental. */
export function compactState(
  options: { seed?: string; participant?: boolean; manager?: string } = {},
): {
  state: CareerSeasonState;
  manager: string;
  seed: string;
} {
  const seed = options.seed ?? CONTINENTAL_SEED;
  const world = compactWorld(seed);
  const competition = world.competitions.find((entry) => entry.id === CONTINENTAL_IDS.major);
  const inside = new Set(competition?.divisions[0]?.clubIds ?? []);
  const wanted = options.participant ?? true;
  const manager = options.manager ?? world.clubs.find((club) => inside.has(club.id) === wanted)?.id;
  if (!manager) throw new Error("sem clube para o técnico");
  return { state: worldState(world, seed, manager), manager, seed };
}

export function continentalLeague(state: Pick<CareerSeasonState, "league" | "competitions">) {
  const league = allSeasons(state).find((entry) => entry.competitionId === CONTINENTAL_IDS.major);
  if (!league) throw new Error("sem a taça continental na temporada");
  return league;
}

export function playDays(
  state: CareerSeasonState,
  days: number | "end",
  seed: string,
  manager: string,
): CareerSeasonState {
  const step = days === "end" ? ({ toEnd: true } as const) : { days };
  return ok(advanceCareerDays(state, step, seed, manager)).state;
}

export function continentalChampion(state: CareerSeasonState): string | undefined {
  const division = continentalLeague(state).divisions[0];
  return division ? standings(division, state.world)[0]?.clubId : undefined;
}

/** Joga dia a dia até `done` valer (ou a temporada acabar); devolve o estado em que valeu. */
export function playUntil(
  state: CareerSeasonState,
  seed: string,
  manager: string,
  done: (state: CareerSeasonState) => boolean,
): CareerSeasonState {
  let current = state;
  while (!done(current)) {
    if (isCalendarOver(current)) throw new Error("a temporada acabou antes da condição");
    current = ok(completeCareerDay(current, seed, manager)).state;
  }
  return current;
}

/** O mundo do estado com a competição trocada por `edit` (para variantes de teste). */
export function editedWorld(
  world: CompletedBank,
  competitionId: string,
  edit: (competition: Competition) => Competition,
): CompletedBank {
  return {
    ...world,
    competitions: world.competitions.map((competition) =>
      competition.id === competitionId ? edit(competition) : competition,
    ),
  } as CompletedBank;
}
