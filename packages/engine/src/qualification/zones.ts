import type { BerthSource, CompletedBank } from "../model/types";
import type { BerthZone } from "./types";

/**
 * Faixas de posição de uma divisão que dão vaga em outras competições (021 R7), derivadas das vagas
 * de todos os destinos cuja fonte é a divisão. Só a fonte primária marca a tabela; o repasse não.
 * `champion` e `runnerUp` de uma liga valem as posições 1 e 2 da divisão 1. Ordenadas por posição.
 */
export function berthZones(
  world: Pick<CompletedBank, "competitions">,
  competitionId: string,
  level: number,
): BerthZone[] {
  const source = world.competitions.find((entry) => entry.id === competitionId);
  if (!source || source.format.type === "knockout") return [];
  const zones: BerthZone[] = [];
  for (const target of world.competitions) {
    for (const division of target.divisions) {
      for (const berth of division.berths ?? []) {
        const from = berth.source;
        if (from.competitionId !== competitionId) continue;
        const range = rangeOf(from, level);
        if (!range) continue;
        zones.push({
          ...range,
          competitionId: target.id,
          level: division.level,
          berthId: berth.id,
          ...(berth.entry && (berth.entry.stage || berth.entry.phase)
            ? { entry: berth.entry }
            : {}),
        });
      }
    }
  }
  return zones.sort(
    (a, b) =>
      a.from - b.from ||
      a.to - b.to ||
      a.competitionId.localeCompare(b.competitionId) ||
      a.berthId.localeCompare(b.berthId),
  );
}

function rangeOf(source: BerthSource, level: number): { from: number; to: number } | undefined {
  switch (source.kind) {
    case "position":
      return source.level === level ? { from: source.from, to: source.to } : undefined;
    case "champion":
      return level === 1 ? { from: 1, to: 1 } : undefined;
    case "runnerUp":
      return level === 1 ? { from: 2, to: 2 } : undefined;
    case "reached":
      return undefined;
  }
}
