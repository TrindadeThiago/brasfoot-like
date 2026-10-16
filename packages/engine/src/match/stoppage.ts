import type { Rng } from "../rng/xoshiro";
import { MATCH_TUNING } from "./tuning";
import type { MatchEvent } from "./types";

/** Acréscimos de um tempo, a partir do que aconteceu nele (research.md R8, FR-012). */
export function stoppageFor(events: readonly MatchEvent[], half: 1 | 2, rng: Rng): number {
  const config = MATCH_TUNING.stoppage;
  let goals = 0;
  let injuries = 0;
  let substitutions = 0;
  let cards = 0;
  for (const event of events) {
    if (event.half !== half) continue;
    if (event.type === "shot" && event.outcome === "goal") goals++;
    else if (event.type === "injury") injuries++;
    else if (event.type === "substitution") substitutions++;
    else if (event.type === "yellow_card" || event.type === "red_card") cards++;
  }
  const raw =
    config.base +
    config.perGoal * goals +
    config.perInjury * injuries +
    config.perSubstitution * substitutions +
    config.perCard * cards +
    rng.int(config.randomExtra[0], config.randomExtra[1]);
  const [min, max] = half === 1 ? config.firstHalf : config.secondHalf;
  return Math.min(max, Math.max(min, Math.round(raw)));
}
