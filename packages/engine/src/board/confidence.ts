import { derbyMultiplierPct, roundResult } from "../fans/mood";
import { fansRules } from "../fans/rules";
import { currentPosition, financeMet } from "./goals";
import { type BoardRules, boardRules } from "./rules";
import type { BoardContext, ConfidenceChange, ConfidenceFactor } from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Fator de confiança de um resultado, com o peso extra de clássico (013 R7). */
export function confidenceResultFactor(
  rules: BoardRules,
  played: { result: "win" | "draw" | "loss"; intensity?: number },
): { kind: ConfidenceFactor; amount: number } {
  const base =
    played.result === "win" ? rules.win : played.result === "loss" ? -rules.loss : rules.draw;
  const amount = Math.trunc((base * derbyMultiplierPct(rules.derbyPct, played.intensity)) / 100);
  const kind: ConfidenceFactor =
    played.intensity === undefined
      ? played.result
      : played.result === "win"
        ? "derbyWin"
        : played.result === "loss"
          ? "derbyLoss"
          : "derbyDraw";
  return { kind, amount };
}

/** Percentual aplicado às parcelas negativas: técnicos de mais reputação têm mais paciência. */
export function patiencePct(context: Pick<BoardContext, "world" | "league">, reputation: number) {
  const rules = boardRules(context.world, context.league.competitionId);
  return Math.max(
    rules.patienceMinPct,
    rules.patienceBasePct - Math.floor((reputation * rules.patiencePerRepPct) / 100),
  );
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
  const played = roundResult(context, clubId, round);
  // Clássico (013 R7): o resultado pesa mais, pela intensidade da rivalidade.
  if (played) raw.push(confidenceResultFactor(rules, played));
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
  const mood = context.fans?.clubs[clubId]?.mood;
  if (mood !== undefined) {
    // Torcida (013 R8): pressão abaixo de um limite, apoio acima de outro.
    const fans = fansRules(context.world, context.league.competitionId);
    if (mood < fans.fanPressureBelow) {
      raw.push({
        kind: "fans",
        amount: -Math.ceil((fans.fanPressureBelow - mood) / fans.fanDivisor),
      });
    } else if (mood > fans.fanSupportAbove) {
      raw.push({
        kind: "fans",
        amount: Math.floor((mood - fans.fanSupportAbove) / fans.fanDivisor),
      });
    }
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
