import { describe, expect, it } from "vitest";
import { regulate } from "../../src/renewal/regulator";
import { REGULATOR_RULES } from "../../src/renewal/rules";
import type { RegulatorState, WorldMeasure } from "../../src/renewal/types";

const NEUTRAL: RegulatorState = { strengthOffset: 0, potentialBonus: 0 };

function measure(mean: number, prospects: number): WorldMeasure {
  return {
    players: 1000,
    mean,
    p10: 45,
    p50: mean,
    p90: 70,
    max: 85,
    stars: 5,
    prospects,
    meanAge: 25,
  };
}

describe("regulador global (US5, R8)", () => {
  it("média acima do alvo baixa o offset; abaixo sobe; passo limitado", () => {
    const high = regulate(NEUTRAL, measure(REGULATOR_RULES.targetMean + 5, 20));
    expect(high.strengthOffset).toBe(-REGULATOR_RULES.maxStep);
    const low = regulate(NEUTRAL, measure(REGULATOR_RULES.targetMean - 1, 20));
    expect(low.strengthOffset).toBeCloseTo(REGULATOR_RULES.gain, 5);
    expect(regulate(NEUTRAL, measure(REGULATOR_RULES.targetMean, 20)).strengthOffset).toBe(0);
  });

  it("pouca promessa de craques aumenta o bônus de potencial; demais reduz", () => {
    expect(regulate(NEUTRAL, measure(59, 0)).potentialBonus).toBe(1);
    expect(regulate(NEUTRAL, measure(59, 100)).potentialBonus).toBe(-1);
    expect(regulate(NEUTRAL, measure(59, 20)).potentialBonus).toBe(0);
  });

  it("respeita os limites e guarda a medida", () => {
    let state = NEUTRAL;
    for (let step = 0; step < 50; step++) state = regulate(state, measure(80, 0));
    // Com o amortecimento, o offset converge para o equilíbrio −passo/leak, dentro da faixa.
    expect(state.strengthOffset).toBeCloseTo(
      Math.max(REGULATOR_RULES.offsetRange[0], -REGULATOR_RULES.maxStep / REGULATOR_RULES.leak),
      1,
    );
    expect(state.potentialBonus).toBe(REGULATOR_RULES.potentialBonusRange[1]);
    expect(state.lastMeasure?.mean).toBe(80);
    expect(regulate(NEUTRAL, measure(70, 1))).toEqual(regulate(NEUTRAL, measure(70, 1)));
  });
});
