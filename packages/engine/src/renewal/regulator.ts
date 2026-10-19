import { REGULATOR_RULES } from "./rules";
import type { RegulatorState, WorldMeasure } from "./types";

function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Regulador global (R8, FR-014): controle proporcional do nível geral (offset de força dos jovens,
 * amortecido) e da cauda alta pela promessa de craques (jovens com potencial de craque), que
 * responde já na geração seguinte e evita a oscilação de regular pelos craques atuais.
 * Determinístico.
 */
export function regulate(state: RegulatorState, measure: WorldMeasure): RegulatorState {
  const {
    targetMean,
    gain,
    maxStep,
    leak,
    offsetRange,
    prospectsRange,
    prospectsStep,
    potentialBonusRange,
  } = REGULATOR_RULES;
  const step = clamp(gain * (targetMean - measure.mean), [-maxStep, maxStep]);
  const bonusStep =
    measure.prospects < prospectsRange[0]
      ? prospectsStep
      : measure.prospects > prospectsRange[1]
        ? -prospectsStep
        : 0;
  return {
    strengthOffset: clamp(state.strengthOffset * (1 - leak) + step, offsetRange),
    potentialBonus: clamp(state.potentialBonus + bonusStep, potentialBonusRange),
    lastMeasure: measure,
  };
}
