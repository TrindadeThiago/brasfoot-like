import { phaseRounds } from "../knockout/rules";
import type { Competition, CompletedBank, Division } from "../model/types";
import { squadsByClub } from "../season/fixture";
import { preferredFormation } from "../season/lineups";
import type { DisciplineRules, PlayerStatus, Round, Season } from "../season/types";
import { stageParticipantCounts, stageRoundRanges, stagesOf } from "./rules";
import { startStage } from "./start";
import type { StageState } from "./types";

/** Criação da temporada de uma divisão disputada em fases (019 R2). */

/** O que `createSeason` já validou: competição, divisão, composição e regras de disciplina. */
export interface StagedSetup {
  competition: Competition;
  division: Division;
  clubIds: string[];
  rules: DisciplineRules;
  seed: string | number;
  status?: Record<string, PlayerStatus>;
}

export function isStagedSeason(season: Season): boolean {
  return season.stages !== undefined;
}

/** Fase a que pertence a rodada `round` (números absolutos do calendário). */
export function stageOfRound(season: Season, round: number): StageState | undefined {
  return season.stages?.find((stage) => stage.rounds.includes(round));
}

/**
 * Cria a temporada da divisão: todas as rodadas de todas as fases já no calendário, com
 * `fixtures` vazias até a fase começar, e a fase 0 começada (grupos sorteados, liga montada ou
 * 1ª fase eliminatória sorteada).
 */
export function createStagedSeason(
  world: CompletedBank,
  setup: StagedSetup,
): { ok: true; season: Season } {
  const { competition, division, clubIds } = setup;
  const stages = stagesOf(competition, division);
  const ranges = stageRoundRanges(stages, clubIds.length);
  const counts = stageParticipantCounts(stages, clubIds.length);
  const squads = squadsByClub(world);
  const formations: Season["formations"] = {};
  for (const clubId of clubIds) {
    formations[clubId] = preferredFormation(squads.get(clubId) ?? []);
  }
  const states: StageState[] = stages.map((format, index) => ({
    index,
    kind: format.type,
    started: false,
    clubIds: [],
    rounds: ranges[index] as number[],
    ...(format.type === "knockout"
      ? {
          bracket: {
            phases: phaseRounds(format, ranges[index]?.[0] ?? 1).map((rounds, phase) => ({
              index: phase,
              drawn: false,
              rounds,
              ties: [],
            })),
          },
        }
      : {}),
  }));
  const total = ranges.reduce((sum, range) => sum + range.length, 0);
  const calendar: Round[] = Array.from({ length: total }, (_, index) => ({
    number: index + 1,
    fixtures: [],
  }));
  const base: Season = {
    competitionId: competition.id,
    divisionLevel: division.level,
    seed: setup.seed,
    rules: setup.rules,
    clubIds,
    formations,
    calendar,
    nextRound: 1,
    records: [],
    status: Object.fromEntries(
      Object.entries(setup.status ?? {}).map(([id, entry]) => [id, { ...entry }]),
    ),
    warnings: [],
    stages: states,
  };
  // A 1ª fase tem os clubes da divisão menos os que só entram depois (`enter`).
  const late = new Set(stages.slice(1).flatMap((stage) => stage.enter ?? []));
  const opening = clubIds.filter((clubId) => !late.has(clubId));
  if (opening.length !== counts[0]) {
    throw new Error(`a fase 0 devia ter ${counts[0]} clubes e tem ${opening.length}`);
  }
  return { ok: true, season: startStage(base, world, 0, opening, new Set()) };
}
