import type { CompletedBank } from "../model/types";
import { standings } from "../season/standings";
import type { LeagueSeason } from "./types";

export interface CompositionChange {
  /** Clubes de cada nível na próxima temporada, ordenados por id. */
  composition: Record<number, string[]>;
  /** Clubes que saem de cada nível para o de cima. */
  promoted: Record<number, string[]>;
  /** Clubes que saem de cada nível para o de baixo. */
  relegated: Record<number, string[]>;
}

/**
 * Composição da próxima temporada a partir das classificações finais (research.md R4): entre cada
 * par de níveis adjacentes, os `relegationSlots` últimos do de cima descem e os `promotionSlots`
 * primeiros do de baixo sobem. As vagas vêm do banco; nenhum número é fixo.
 */
export function nextComposition(league: LeagueSeason, world: CompletedBank): CompositionChange {
  const competition = world.competitions.find((entry) => entry.id === league.competitionId);
  if (!competition) throw new Error(`competição inexistente: ${league.competitionId}`);
  const levels = [...league.divisions].sort((a, b) => a.divisionLevel - b.divisionLevel);
  const tables = new Map(
    levels.map((season) => [
      season.divisionLevel,
      standings(season, world).map((row) => row.clubId),
    ]),
  );
  const slots = (level: number) =>
    competition.divisions.find((division) => division.level === level);
  const promoted: Record<number, string[]> = {};
  const relegated: Record<number, string[]> = {};
  for (const season of levels) {
    promoted[season.divisionLevel] = [];
    relegated[season.divisionLevel] = [];
  }
  for (let index = 0; index + 1 < levels.length; index++) {
    const upper = levels[index]?.divisionLevel as number;
    const lower = levels[index + 1]?.divisionLevel as number;
    const upperTable = tables.get(upper) ?? [];
    const down = slots(upper)?.relegationSlots ?? 0;
    const up = slots(lower)?.promotionSlots ?? 0;
    relegated[upper] = down > 0 ? upperTable.slice(upperTable.length - down) : [];
    promoted[lower] = (tables.get(lower) ?? []).slice(0, up);
  }
  const composition: Record<number, string[]> = {};
  levels.forEach((season, index) => {
    const level = season.divisionLevel;
    const leaving = new Set([...(promoted[level] ?? []), ...(relegated[level] ?? [])]);
    const above = levels[index - 1]?.divisionLevel;
    const below = levels[index + 1]?.divisionLevel;
    composition[level] = [
      ...(tables.get(level) ?? []).filter((clubId) => !leaving.has(clubId)),
      ...(above === undefined ? [] : (relegated[above] ?? [])),
      ...(below === undefined ? [] : (promoted[below] ?? [])),
    ].sort();
  });
  return { composition, promoted, relegated };
}
