import { advanceCareerDays } from "../../src/career/day";
import { type CareerHistory, EMPTY_HISTORY, startNextSeason } from "../../src/career/next-season";
import type { CareerSeasonState } from "../../src/career/season-state";
import type { LeagueSeason } from "../../src/career/types";
import type { CompletedBank } from "../../src/model/types";
import { clubOfCountry, worldState } from "./world-helpers";

export function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

export interface PlayedSeason {
  /** Estado no primeiro dia da temporada. */
  start: CareerSeasonState;
  /** Estado ao fim da temporada. */
  end: CareerSeasonState;
}

/** Joga `count` temporadas sem interação e devolve início e fim de cada uma, mais o histórico. */
export function playSeasons(
  world: CompletedBank,
  seed: string,
  count: number,
  options: { roundTrip?: boolean; manager?: string } = {},
): { seasons: PlayedSeason[]; history: CareerHistory } {
  const manager = options.manager ?? clubOfCountry(world, 0);
  let state = worldState(world, seed, manager);
  let history: CareerHistory = EMPTY_HISTORY;
  const seasons: PlayedSeason[] = [];
  for (let index = 0; index < count; index++) {
    const start = state;
    let end = ok(advanceCareerDays(state, { toEnd: true }, seed, manager)).state;
    if (options.roundTrip) {
      end = JSON.parse(JSON.stringify(end)) as CareerSeasonState;
      history = JSON.parse(JSON.stringify(history)) as CareerHistory;
    }
    seasons.push({ start, end });
    const next = ok(startNextSeason(end, seed, history, manager));
    state = next.state;
    history = next.history;
  }
  return { seasons, history };
}

export function allSeasons(
  state: Pick<CareerSeasonState, "league" | "competitions">,
): LeagueSeason[] {
  return [state.league, ...state.competitions];
}
