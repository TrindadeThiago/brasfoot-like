import { clubDivision } from "../career/league";
import { currentPosition, financeMet } from "./goals";
import { boardRules } from "./rules";
import type { BoardContext, ConfidenceChange, ConfidenceFactor } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Percentual aplicado às parcelas negativas: técnicos de mais reputação têm mais paciência. */
export function patiencePct(context: Pick<BoardContext, "world" | "league">, reputation: number) {
  const rules = boardRules(context.world, context.league.competitionId);
  return Math.max(
    rules.patienceMinPct,
    rules.patienceBasePct - Math.floor((reputation * rules.patiencePerRepPct) / 100),
  );
}

/** Resultado do clube na rodada, ou nada se não jogou. */
function resultOf(
  context: Pick<BoardContext, "league">,
  clubId: string,
  round: number,
): "win" | "draw" | "loss" | undefined {
  const season = clubDivision(context.league, clubId);
  const record = season?.records.find(
    (entry) => entry.round === round && (entry.home === clubId || entry.away === clubId),
  );
  if (!record) return undefined;
  const own = record.home === clubId ? record.score.home : record.score.away;
  const other = record.home === clubId ? record.score.away : record.score.home;
  return own > other ? "win" : own < other ? "loss" : "draw";
}

/**
 * Mudança de confiança do clube na rodada (research.md R7): resultado, distância da meta (a
 * confiança anda em direção a um alvo que depende da posição) e finanças; as parcelas negativas
 * passam pela paciência. O resultado fica em [0, 100].
 */
export function confidenceChange(
  context: BoardContext,
  clubId: string,
  round: number,
  coachReputation: number,
): ConfidenceChange {
  const rules = boardRules(context.world, context.league.competitionId);
  const club = context.board.clubs[clubId];
  const confidence = club?.confidence ?? rules.neutral;
  const raw: { kind: ConfidenceFactor; amount: number }[] = [];
  const result = resultOf(context, clubId, round);
  if (result === "win") raw.push({ kind: "win", amount: rules.win });
  if (result === "draw") raw.push({ kind: "draw", amount: rules.draw });
  if (result === "loss") raw.push({ kind: "loss", amount: -rules.loss });
  const goals = club?.goals;
  if (goals && goals.season === context.league.number && round >= rules.goalCheckFromRound) {
    const gap = currentPosition(context, clubId) - goals.sport.position;
    const target =
      gap > 0
        ? rules.neutral - gap * rules.gapWeight
        : rules.neutral + Math.min(rules.aheadCap, -gap * rules.aheadWeight);
    const drift = Math.trunc((clamp(target, 0, 100) - confidence) / rules.driftDivisor);
    if (drift !== 0) raw.push({ kind: drift > 0 ? "aheadOfGoal" : "belowGoal", amount: drift });
  }
  const finance = context.finances.clubs[clubId];
  if (finance?.inCrisis) raw.push({ kind: "crisis", amount: -rules.crisisPenalty });
  else if (goals && goals.season === context.league.number && !financeMet(context, clubId, goals)) {
    raw.push({ kind: "financeGoal", amount: -rules.financePenalty });
  }
  const patience = patiencePct(context, coachReputation);
  const factors = raw
    .map((factor) =>
      factor.amount < 0
        ? { ...factor, amount: -Math.round((-factor.amount * patience) / 100) }
        : factor,
    )
    .filter((factor) => factor.amount !== 0);
  const total = factors.reduce((sum, factor) => sum + factor.amount, 0);
  const value = clamp(confidence + total, 0, 100);
  return {
    season: context.league.number,
    round,
    delta: value - confidence,
    value,
    factors,
  };
}
