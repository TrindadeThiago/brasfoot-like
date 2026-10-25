import type { Competition, CompletedBank, Division, StageFormat } from "../model/types";
import { stagesOf } from "../stages/rules";
import type { Entry, QualificationResult } from "./types";

/**
 * Aplica o resultado da resolução ao mundo vivo (021 R2): os participantes da próxima temporada
 * viram os `clubIds` das divisões com vagas, e os clubes que entram tarde viram `entries` (copa) e
 * `enter` (fases). Assim `stages/` e `knockout/` leem a temporada nova como sempre leram, sem
 * conhecer as vagas. Devolve um mundo novo; o original não muda.
 */

function groupBy<T>(items: readonly T[], key: (item: T) => number): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

function knockoutEntries(clubs: Record<string, Entry>, stage: number | undefined) {
  const entering = Object.entries(clubs)
    .filter(([, entry]) => (entry.stage ?? 1) === (stage ?? 1) && entry.phase !== undefined)
    .map(([clubId, entry]) => ({ clubId, phase: (entry.phase as number) - 1 }));
  return [...groupBy(entering, (item) => item.phase)]
    .sort(([a], [b]) => a - b)
    .map(([phase, items]) => ({ phase, clubIds: items.map((item) => item.clubId).sort() }));
}

function withEntries(stage: StageFormat, entries: ReturnType<typeof knockoutEntries>): StageFormat {
  if (stage.type !== "knockout") return stage;
  const { entries: _old, ...rest } = stage;
  return (entries.length > 0 ? { ...rest, entries } : rest) as StageFormat;
}

function rebuildStages(
  stages: readonly StageFormat[],
  clubs: Record<string, Entry>,
): StageFormat[] {
  return stages.map((stage, index) => {
    const number = index + 1;
    const { enter: _enter, ...rest } = stage as StageFormat & { enter?: string[] };
    const entering = Object.entries(clubs)
      .filter(([, entry]) => entry.stage === number && entry.phase === undefined)
      .map(([clubId]) => clubId)
      .sort();
    const next = (entering.length > 0 ? { ...rest, enter: entering } : rest) as StageFormat;
    return withEntries(next, knockoutEntries(clubs, number));
  });
}

function applyDivision(
  competition: Competition,
  division: Division,
  composition: readonly string[],
  clubs: Record<string, Entry>,
): { competition: Competition; division: Division } {
  let nextDivision: Division = { ...division, clubIds: [...composition] };
  let nextCompetition = competition;
  const { format } = competition;
  if (format.type === "knockout") {
    nextCompetition = {
      ...competition,
      format: withEntries(format, knockoutEntries(clubs, 1)) as Competition["format"],
    };
  } else if (division.stages) {
    nextDivision = {
      ...nextDivision,
      stages: rebuildStages(stagesOf(competition, division), clubs),
    };
  } else if (format.type === "stages") {
    nextCompetition = {
      ...competition,
      format: { ...format, stages: rebuildStages(format.stages, clubs) },
    };
  }
  return { competition: nextCompetition, division: nextDivision };
}

export function applyQualification(
  world: CompletedBank,
  result: Pick<QualificationResult, "compositions" | "entrants">,
): CompletedBank {
  const competitions = world.competitions.map((competition) => {
    const compositions = result.compositions[competition.id];
    if (!compositions) return competition;
    let current = competition;
    for (const division of competition.divisions) {
      const composition = compositions[division.level];
      if (!composition) continue;
      // Todas as divisões da competição seguem a composição nova: a união dos clubes dela é o que
      // `createLeagueSeason` confere. Só as divisões com vagas refazem as entradas tardias.
      if ((division.berths?.length ?? 0) === 0) {
        current = {
          ...current,
          divisions: current.divisions.map((entry) =>
            entry.level === division.level ? { ...entry, clubIds: [...composition] } : entry,
          ),
        };
        continue;
      }
      const clubs = result.entrants[competition.id]?.[division.level] ?? {};
      const applied = applyDivision(current, division, composition, clubs);
      current = {
        ...applied.competition,
        divisions: applied.competition.divisions.map((entry) =>
          entry.level === division.level ? applied.division : entry,
        ),
      };
    }
    return current;
  });
  return { ...world, competitions };
}
