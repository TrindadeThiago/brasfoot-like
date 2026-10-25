import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import type { BerthZone, Origin } from "../qualification/types";
import { seasonStages } from "../stages/rules";

/**
 * Visão da competição entre países (022 R10): as fases em ordem, o estado de cada uma, as posições
 * dos grupos que descem para outra competição e a origem dos participantes. A tela só desenha.
 */

export type StageStatus = "pending" | "playing" | "finished";

export interface ContinentalStageView {
  /** Fase da sequência, a partir de 1. */
  index: number;
  kind: "league" | "groups" | "knockout";
  status: StageStatus;
  /** Posições desta fase que descem para outra competição durante a temporada. */
  dropIns: BerthZone[];
}

export interface ContinentalView {
  competitionId: string;
  stages: ContinentalStageView[];
  origins: Record<string, Origin>;
}

/** Posições da fase `stageIndex` (a partir de 0) que as ligações levam a outra competição. */
export function dropInZones(
  world: Pick<CompletedBank, "competitions">,
  competitionId: string,
  stageIndex: number,
): BerthZone[] {
  const zones: BerthZone[] = [];
  for (const competition of world.competitions) {
    for (const division of competition.divisions) {
      for (const dropIn of division.dropIns ?? []) {
        const { source } = dropIn;
        if (
          source.kind !== "position" ||
          source.competitionId !== competitionId ||
          source.stage !== stageIndex + 1
        ) {
          continue;
        }
        zones.push({
          from: source.from,
          to: source.to,
          competitionId: competition.id,
          level: division.level,
          entry: {
            stage: dropIn.entry.stage,
            ...(dropIn.entry.phase !== undefined ? { phase: dropIn.entry.phase } : {}),
          },
          berthId: dropIn.id,
        });
      }
    }
  }
  return zones;
}

export function continentalView(world: CompletedBank, league: LeagueSeason): ContinentalView {
  const season = league.divisions[0];
  const stages = season ? seasonStages(world, season) : [];
  return {
    competitionId: league.competitionId,
    stages: stages.map((format, index) => {
      const state = season?.stages?.[index];
      const finished =
        !!season &&
        !!state?.started &&
        state.rounds.length > 0 &&
        season.nextRound > Math.max(...state.rounds);
      return {
        index: index + 1,
        kind: format.type,
        status: !state?.started ? "pending" : finished ? "finished" : "playing",
        dropIns: dropInZones(world, league.competitionId, index),
      };
    }),
    origins: league.origins ?? {},
  };
}
