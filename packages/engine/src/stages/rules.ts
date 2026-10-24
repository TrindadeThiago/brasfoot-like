import { theoreticalRounds } from "../calendar/rounds";
import type {
  Competition,
  CompletedBank,
  Division,
  KnockoutFormat,
  StageFormat,
} from "../model/types";
import type { Season } from "../season/types";

/** Regras de contagem das fases de uma divisão (019 R1, R4, R11): tudo sai dos dados. */

/** Padrões dos campos opcionais de uma fase. */
export const DEFAULT_STAGES = {
  extra: 0,
  gapWeeks: 0,
} as const;

/** Constantes do sorteio dos grupos (019 R6). */
export const GROUP_DRAW_TUNING = {
  /** Teto de nós da busca do sorteio, contado (não cronometrado) para manter o determinismo. */
  nodeBudget: 200_000,
} as const;

/**
 * Fases da divisão, normalizadas (019 R1): `division.stages` vence; senão, as do formato da
 * competição (`stages`), ou a fase única de `league`, `knockout` e `groups`.
 */
export function stagesOf(
  competition: Pick<Competition, "format">,
  division: Pick<Division, "stages">,
): StageFormat[] {
  if (division.stages) return division.stages;
  const { format } = competition;
  if (format.type === "stages") return format.stages;
  return [format];
}

/** O que as fases leem do mundo: só as competições (o resto vem da `Season`). */
export type StageWorld = Pick<CompletedBank, "competitions">;

/** Fases da divisão a que a `Season` pertence, normalizadas. */
export function seasonStages(
  world: StageWorld,
  season: Pick<Season, "competitionId" | "divisionLevel">,
): StageFormat[] {
  const competition = world.competitions.find((entry) => entry.id === season.competitionId);
  if (!competition) throw new Error(`competição inexistente: ${season.competitionId}`);
  const division = competition.divisions.find((entry) => entry.level === season.divisionLevel);
  if (!division) throw new Error(`divisão inexistente: ${season.divisionLevel}`);
  return stagesOf(competition, division);
}

/** A divisão é disputada em fases (e não como uma liga simples ou uma copa da 018). */
export function isStaged(
  competition: Pick<Competition, "format">,
  division: Pick<Division, "stages">,
): boolean {
  return (
    division.stages !== undefined ||
    competition.format.type === "groups" ||
    competition.format.type === "stages"
  );
}

/**
 * Clubes de cada fase de um mata-mata (018 R2/R6): a fase 0 tem os participantes menos os que
 * entram depois; as seguintes, metade dos classificados da anterior mais as entradas. `winners` é
 * quem avança da última fase (1 se for a final, mais se o mata-mata é uma fase intermediária).
 */
export function knockoutCounts(
  stage: KnockoutFormat,
  participants: number,
): { phases: number[]; winners: number } {
  const entering = (phase: number) =>
    (stage.entries ?? [])
      .filter((entry) => entry.phase === phase)
      .reduce((sum, entry) => sum + entry.clubIds.length, 0);
  const late = (stage.entries ?? []).reduce((sum, entry) => sum + entry.clubIds.length, 0);
  const phases: number[] = [];
  stage.phases.forEach((_, index) => {
    phases.push(
      index === 0 ? participants - late : (phases[index - 1] as number) / 2 + entering(index),
    );
  });
  return { phases, winners: (phases.at(-1) ?? 0) / 2 };
}

/** Rodadas de uma fase com `participants` clubes (grupos e mata-mata não dependem do número). */
export function stageRounds(stage: StageFormat, participants: number): number {
  switch (stage.type) {
    case "league":
      return theoreticalRounds(participants, stage.rounds);
    case "groups":
      return theoreticalRounds(stage.groupSize, stage.rounds);
    case "knockout":
      return stage.phases.reduce((sum, phase) => sum + phase.legs, 0);
  }
}

/** Quantos clubes a fase classifica para a seguinte (0 se não declara classificados). */
export function stageQualifierCount(stage: StageFormat, participants: number): number {
  switch (stage.type) {
    case "league":
      return stage.qualified ?? 0;
    case "groups": {
      if (stage.qualified === undefined) return 0;
      const groups = participants / stage.groupSize;
      return stage.qualified * groups + (stage.extra ?? DEFAULT_STAGES.extra);
    }
    case "knockout":
      return knockoutCounts(stage, participants).winners;
  }
}

/** Clubes que entram na fase além dos classificados da anterior. */
function enterOf(stage: StageFormat): number {
  return stage.enter?.length ?? 0;
}

/** Participantes de cada fase: a primeira tira os que só entram depois; as seguintes somam. */
export function stageParticipantCounts(
  stages: readonly StageFormat[],
  divisionClubs: number,
): number[] {
  const counts: number[] = [];
  const late = stages.slice(1).reduce((sum, stage) => sum + enterOf(stage), 0);
  stages.forEach((stage, index) => {
    if (index === 0) {
      counts.push(divisionClubs - late);
      return;
    }
    const previous = stages[index - 1] as StageFormat;
    counts.push(stageQualifierCount(previous, counts[index - 1] as number) + enterOf(stage));
  });
  return counts;
}

/** Rodadas absolutas de cada fase: intervalos contíguos que cobrem o calendário em ordem. */
export function stageRoundRanges(
  stages: readonly StageFormat[],
  divisionClubs: number,
): number[][] {
  const counts = stageParticipantCounts(stages, divisionClubs);
  let next = 1;
  return stages.map((stage, index) => {
    const total = stageRounds(stage, counts[index] as number);
    const range = Array.from({ length: total }, () => next++);
    return range;
  });
}
