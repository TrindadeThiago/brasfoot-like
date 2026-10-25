import type { Competition, Division, DropIn, ModPackage } from "../model/types";
import { knockoutCounts, stageParticipantCounts, stagesOf } from "./rules";

/**
 * Clubes que chegam a uma fase por ligação entre competições (022 R3): quantos são, a partir dos
 * dados. A contagem sai da estrutura da competição de origem, sem depender da temporada.
 */

const MAX_DEPTH = 4;

/** Quantos clubes uma ligação traz; undefined se a fonte não existe ou não cabe no formato. */
export function dropInSize(
  world: Pick<ModPackage, "competitions">,
  dropIn: DropIn,
  depth = 0,
): number | undefined {
  if (depth > MAX_DEPTH) return undefined;
  const { source } = dropIn;
  const competition = world.competitions.find((entry) => entry.id === source.competitionId);
  const division = competition?.divisions[0];
  if (!competition || !division) return undefined;
  const stages = stagesOf(competition, division);
  const stage = stages[source.stage - 1];
  if (!stage) return undefined;
  const counts = stageParticipantCounts(
    stages,
    division.clubIds.length,
    incomingCounts(world, competition, division, depth + 1),
  );
  const participants = counts[source.stage - 1] as number;
  if (source.kind === "position") {
    const taken = source.to - source.from + 1;
    if (taken < 1) return undefined;
    if (stage.type === "groups") {
      const groups = participants / stage.groupSize;
      return Number.isInteger(groups) && source.to <= stage.groupSize ? groups * taken : undefined;
    }
    if (stage.type === "league") return source.to <= participants ? taken : undefined;
    return undefined;
  }
  if (stage.type !== "knockout") return undefined;
  const phase = knockoutCounts(stage, participants).phases[source.phase - 1];
  return phase === undefined ? undefined : phase / 2;
}

/** Clubes que chegam por ligação em cada fase (índice da fase, a partir de 0) da divisão. */
export function incomingCounts(
  world: Pick<ModPackage, "competitions">,
  competition: Pick<Competition, "id">,
  division: Pick<Division, "dropIns">,
  depth = 0,
): number[] {
  const counts: number[] = [];
  for (const dropIn of division.dropIns ?? []) {
    const index = dropIn.entry.stage - 1;
    if (dropIn.source.competitionId === competition.id) continue;
    counts[index] = (counts[index] ?? 0) + (dropInSize(world, dropIn, depth) ?? 0);
  }
  return Array.from({ length: counts.length }, (_, index) => counts[index] ?? 0);
}
