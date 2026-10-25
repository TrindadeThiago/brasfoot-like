import { drawReady } from "../knockout/bracket";
import { phaseWinners } from "../knockout/tie";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { stageQualifiers } from "./classification";
import { applyCupView, cupView } from "./cup-view";
import { seasonStages } from "./rules";
import { startStage, tagStageFixtures } from "./start";

/** Avanço das fases a cada rodada fechada (019 R4). */

/** Ligações que a divisão da temporada espera de outras competições (022). */
function dropInsOf(world: CompletedBank, season: Season) {
  return world.competitions
    .find((entry) => entry.id === season.competitionId)
    ?.divisions.find((entry) => entry.level === season.divisionLevel)?.dropIns;
}

/** Todas as rodadas da fase foram jogadas. */
function stageFinished(season: Season, index: number): boolean {
  const rounds = season.stages?.[index]?.rounds ?? [];
  return rounds.length > 0 && season.nextRound > Math.max(...rounds);
}

/** Clubes que a fase classifica para a seguinte. */
function qualifiersOf(season: Season, world: CompletedBank, index: number): string[] {
  const format = seasonStages(world, season)[index];
  if (format?.type === "knockout") {
    const view = cupView(season, world, index);
    const last = (view.bracket?.phases.length ?? 1) - 1;
    return phaseWinners(view, last);
  }
  return stageQualifiers(season, world, index).map((qualifier) => qualifier.clubId);
}

/** Um passo: sorteia fases eliminatórias prontas ou começa a fase seguinte; a mesma `Season` se nada mudar. */
function step(season: Season, world: CompletedBank): Season {
  const stages = season.stages ?? [];
  for (const state of stages) {
    if (!state.started || state.kind !== "knockout") continue;
    const view = cupView(season, world, state.index);
    const ready = drawReady(view, world);
    if (ready !== view) {
      const folded = applyCupView(season, ready, state.index);
      return tagStageFixtures(folded, folded.stages?.[state.index] ?? state);
    }
  }
  const next = stages.findIndex((state) => !state.started);
  if (next <= 0 || !stageFinished(season, next - 1)) return season;
  // Ligação entre competições (022 R3): a fase espera a lista de quem desce de outra competição.
  const incoming = stages[next]?.incoming ?? [];
  const expected = (dropInsOf(world, season) ?? []).filter(
    (dropIn) => dropIn.entry.stage === next + 1,
  );
  if (expected.some((dropIn) => !incoming.some((entry) => entry.dropInId === dropIn.id))) {
    return season;
  }
  const formats = seasonStages(world, season);
  const qualified = qualifiersOf(season, world, next - 1);
  const entering = formats[next]?.enter ?? [];
  const arriving = incoming.flatMap((entry) => entry.clubIds);
  return startStage(
    season,
    world,
    next,
    [...qualified, ...entering, ...arriving],
    new Set(qualified),
  );
}

/**
 * Faz a divisão em fases andar: sorteia as fases eliminatórias prontas e começa a fase seguinte
 * quando a anterior termina. Idempotente; devolve a mesma `Season` quando nada precisa avançar e
 * não altera `records`.
 */
export function advanceStages(season: Season, world: CompletedBank): Season {
  if (!season.stages) return season;
  let current = season;
  for (;;) {
    const next = step(current, world);
    if (next === current) return current;
    current = next;
  }
}
