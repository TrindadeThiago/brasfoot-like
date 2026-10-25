import { cupChampion } from "../knockout/tie";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { cupView } from "../stages/cup-view";
import type { Reached } from "./types";

/**
 * Fase alcançada por cada clube numa competição em fases (022 R5, R8): a mais alta em que o clube
 * aparece. `{ stage }` = participou da fase; `{ stage, phase }` = foi sorteado até aquela fase do
 * mata-mata; o campeão vale uma fase depois da final (`phases + 1`), como no histórico das copas.
 */

/** Ordem entre fases: a maior etapa vence; na mesma etapa, a maior fase (sem fase = 0). */
export function compareReached(a: Reached, b: Reached): number {
  return a.stage - b.stage || (a.phase ?? 0) - (b.phase ?? 0);
}

/** O clube que alcançou `reached` já alcançou ao menos `wanted`? */
export function reachedAtLeast(reached: Reached, wanted: Reached): boolean {
  return compareReached(reached, wanted) >= 0;
}

/** Campeão e vice da edição, quando a final já se decidiu. */
export function finalOf(
  world: Pick<CompletedBank, "competitions">,
  season: Season,
): { championId: string; runnerUpId: string } | undefined {
  if (season.bracket) return cupChampion(season);
  const last = season.stages?.at(-1);
  if (last?.kind === "knockout" && last.started) {
    return cupChampion(cupView(season, world, last.index));
  }
  return undefined;
}

/** Campeão da edição, quando já se definiu. */
export function championOf(
  world: Pick<CompletedBank, "competitions">,
  season: Season,
): string | undefined {
  return finalOf(world, season)?.championId;
}

export function reachedByClub(
  world: Pick<CompletedBank, "competitions" | "clubs" | "countries" | "players">,
  season: Season,
): Map<string, Reached> {
  const result = new Map<string, Reached>();
  const bump = (clubId: string, reached: Reached) => {
    const current = result.get(clubId);
    if (!current || compareReached(reached, current) > 0) result.set(clubId, reached);
  };
  const fromBracket = (stage: number, bracket: NonNullable<Season["bracket"]>) => {
    for (const phase of bracket.phases) {
      if (!phase.drawn) continue;
      for (const tie of phase.ties) {
        bump(tie.home, { stage, phase: phase.index + 1 });
        bump(tie.away, { stage, phase: phase.index + 1 });
      }
    }
  };
  if (season.stages) {
    for (const state of season.stages) {
      if (!state.started) continue;
      for (const clubId of state.clubIds) bump(clubId, { stage: state.index + 1 });
      if (state.bracket) fromBracket(state.index + 1, state.bracket);
    }
  } else if (season.bracket) {
    for (const clubId of season.clubIds) bump(clubId, { stage: 1 });
    fromBracket(1, season.bracket);
  } else {
    for (const clubId of season.clubIds) bump(clubId, { stage: 1 });
  }
  const champion = championOf(world, season);
  if (champion) {
    const last = season.stages?.at(-1);
    const stage = last ? last.index + 1 : 1;
    const phases = (last?.bracket ?? season.bracket)?.phases.length ?? 0;
    bump(champion, { stage, phase: phases + 1 });
  }
  return result;
}
