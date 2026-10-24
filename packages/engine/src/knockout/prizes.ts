import type { DayMatch } from "../career/season-state";
import type { CompletedBank } from "../model/types";
import type { Season } from "../season/types";
import { seasonStages } from "../stages/rules";
import { cupFormat, cupMatchBelongs, DEFAULT_KNOCKOUT, knockoutFormat, phaseOf } from "./rules";
import { tieState } from "./tie";

export interface CupPrize {
  clubId: string;
  amount: number;
  /** Índice da fase em que o confronto foi decidido. */
  phase: number;
  date: string;
}

/**
 * Prêmios do dia (018 R12): o vencedor de cada confronto decidido nos jogos do dia recebe o prêmio
 * da fase, uma vez; o campeão recebe o da final. `season` é a temporada da copa já com o dia fechado.
 */
export function cupPrizes(
  world: Pick<CompletedBank, "competitions">,
  season: Season,
  matches: readonly DayMatch[],
): CupPrize[] {
  const prizes: CupPrize[] = [];
  const format = cupFormat(world, season);
  for (const match of matches) {
    const info = match.fixture.tie;
    if (!cupMatchBelongs(season, match) || !info || info.leg !== info.legs) continue;
    const state = tieState(season, info.phase, info.id);
    if (!state.decided || !state.winner) continue;
    prizes.push({
      clubId: state.winner,
      amount: phaseOf(format, info.phase).prize,
      phase: info.phase,
      date: match.date,
    });
  }
  return prizes;
}

/** Capacidade do estádio neutro da fase do jogo. */
export function neutralCapacityOf(
  world: Pick<CompletedBank, "competitions">,
  competitionId: string,
  phase: number,
  where?: { stage: number; divisionLevel: number },
): number {
  // Numa divisão em fases (019) a fase eliminatória é a `stage`-ésima da sequência da divisão.
  const stage = where
    ? seasonStages(world, { competitionId, divisionLevel: where.divisionLevel })[where.stage]
    : undefined;
  const format = stage?.type === "knockout" ? stage : knockoutFormat(world, competitionId);
  return phaseOf(format, phase).neutralCapacity ?? DEFAULT_KNOCKOUT.neutralCapacity;
}
