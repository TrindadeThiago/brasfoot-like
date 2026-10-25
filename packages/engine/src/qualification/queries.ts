import type { CareerSeasonState } from "../career/season-state";
import { competitionSeason } from "../career/season-state";
import type { Origin, QualificationEntry, QualificationRecord } from "./types";

/** Como cada participante da competição chegou à temporada em curso (021 R7). */
export function participantOrigins(
  state: Pick<CareerSeasonState, "league" | "competitions">,
  competitionId: string,
): Record<string, Origin> {
  return competitionSeason(state, competitionId).origins ?? {};
}

/** Vagas resolvidas ao fim da temporada `number` para a competição de destino. */
export function qualificationOutcome(
  history: readonly QualificationRecord[],
  number: number,
  competitionId: string,
): QualificationEntry[] {
  return (
    history
      .find((record) => record.number === number)
      ?.entries.filter((entry) => entry.competitionId === competitionId) ?? []
  );
}

/** Vagas do clube resolvidas ao fim da temporada mais recente do histórico. */
export function clubQualification(
  history: readonly QualificationRecord[],
  clubId: string,
): QualificationEntry[] {
  const last = history.at(-1);
  return last?.entries.filter((entry) => entry.clubId === clubId) ?? [];
}
