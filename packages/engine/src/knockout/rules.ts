import type { CompletedBank, KnockoutFormat, KnockoutPhase } from "../model/types";
import type { Season } from "../season/types";

/** Padrões dos campos opcionais de uma fase (018 data-model.md). */
export const DEFAULT_KNOCKOUT = {
  seeded: false,
  neutral: false,
  gapWeeks: 0,
  neutralCapacity: 40_000,
} as const;

/** Formato eliminatório da competição; falha se ela não for uma copa. */
export function knockoutFormat(
  world: Pick<CompletedBank, "competitions">,
  competitionId: string,
): KnockoutFormat {
  const competition = world.competitions.find((entry) => entry.id === competitionId);
  if (!competition) throw new Error(`competição inexistente: ${competitionId}`);
  if (competition.format.type !== "knockout") throw new Error(`${competitionId} não é uma copa`);
  return competition.format;
}

/** Total de rodadas (pernas) da copa: uma por perna de cada fase. */
export function totalLegs(format: KnockoutFormat): number {
  return format.phases.reduce((sum, phase) => sum + phase.legs, 0);
}

/** Formato do mata-mata da temporada: o da visão de uma fase (019) ou o da copa da competição. */
export function cupFormat(
  world: Pick<CompletedBank, "competitions">,
  season: Pick<Season, "competitionId" | "cupView">,
): KnockoutFormat {
  return season.cupView?.format ?? knockoutFormat(world, season.competitionId);
}

/**
 * O jogo do dia é da copa (ou da fase eliminatória, numa visão): mesma competição e, numa visão, a
 * mesma divisão e a mesma fase da sequência (019).
 */
export function cupMatchBelongs(
  season: Pick<Season, "competitionId" | "divisionLevel" | "cupView">,
  match: { competitionId: string; divisionLevel: number; fixture: { stage?: { index: number } } },
): boolean {
  if (match.competitionId !== season.competitionId) return false;
  if (!season.cupView) return true;
  return (
    match.divisionLevel === season.divisionLevel &&
    match.fixture.stage?.index === season.cupView.stage
  );
}

/** Números das rodadas (a partir de `firstRound`, padrão 1) das pernas de cada fase, em ordem. */
export function phaseRounds(format: KnockoutFormat, firstRound = 1): number[][] {
  let next = firstRound;
  return format.phases.map((phase) => {
    const rounds = Array.from({ length: phase.legs }, () => next++);
    return rounds;
  });
}

/** Fase e perna (1 ou 2) a que pertence a rodada `round`. */
export function phaseOfRound(
  format: KnockoutFormat,
  round: number,
): { phase: number; leg: 1 | 2 } | undefined {
  const rounds = phaseRounds(format);
  for (const [phase, list] of rounds.entries()) {
    const index = list.indexOf(round);
    if (index >= 0) return { phase, leg: (index + 1) as 1 | 2 };
  }
  return undefined;
}

/** Participantes da fase 0: todos os da divisão que não estão em nenhuma entrada posterior. */
export function openingClubs(format: KnockoutFormat, participants: readonly string[]): string[] {
  const late = new Set((format.entries ?? []).flatMap((entry) => entry.clubIds));
  return participants.filter((clubId) => !late.has(clubId));
}

export function phaseOf(format: KnockoutFormat, index: number): KnockoutPhase {
  const phase = format.phases[index];
  if (!phase) throw new Error(`fase inexistente: ${index}`);
  return phase;
}
