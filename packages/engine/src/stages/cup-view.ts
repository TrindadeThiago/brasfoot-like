import type { KnockoutStage } from "../model/types";
import type { Season } from "../season/types";
import { leagueStageStandings, overallStandings } from "./classification";
import { type StageWorld, seasonStages } from "./rules";

/**
 * Visão da fase eliminatória de uma divisão em fases (019 R3): uma `Season` cujo `bracket`,
 * `clubIds` e formato são os da fase, para o módulo `knockout/` (sorteio, `tieState`, prêmios)
 * trabalhar como numa copa. O resultado volta para `Season.stages` por `applyCupView`.
 */

/** Posição de cada clube na classificação geral da fase de pontos anterior (vazio se não houver). */
export function overallRanks(
  season: Season,
  world: StageWorld,
  stageIndex: number,
): Record<string, number> {
  const formats = seasonStages(world, season);
  for (let index = stageIndex - 1; index >= 0; index--) {
    const format = formats[index];
    const state = season.stages?.[index];
    if (!format || !state?.started || format.type === "knockout") continue;
    const rows =
      format.type === "groups"
        ? overallStandings(season, world, index)
        : leagueStageStandings(season, world, index);
    return Object.fromEntries(rows.map((row) => [row.clubId, row.position]));
  }
  return {};
}

export function cupView(season: Season, world: StageWorld, stageIndex: number): Season {
  const format = seasonStages(world, season)[stageIndex];
  const state = season.stages?.[stageIndex];
  if (!format || !state) throw new Error(`fase inexistente: ${stageIndex}`);
  if (format.type !== "knockout" || !state.bracket) {
    throw new Error(`a fase ${stageIndex} não é eliminatória`);
  }
  return {
    ...season,
    clubIds: state.clubIds,
    bracket: state.bracket,
    cupView: {
      stage: stageIndex,
      format: format as KnockoutStage,
      ranks: overallRanks(season, world, stageIndex),
    },
  };
}

/** Devolve as `fixtures` e o `bracket` de uma visão para a fase de `season`; o resto não muda. */
export function applyCupView(season: Season, view: Season, stageIndex: number): Season {
  return {
    ...season,
    calendar: view.calendar,
    stages: (season.stages ?? []).map((stage) =>
      stage.index === stageIndex && view.bracket ? { ...stage, bracket: view.bracket } : stage,
    ),
  };
}
