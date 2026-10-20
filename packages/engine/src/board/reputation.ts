import type { BoardRules } from "./rules";
import type { Achievement } from "./types";

export interface ReputationInput {
  reputation: number;
  clubReputation: number;
  /** Ausente quando o técnico não foi avaliado (demissão no meio da temporada). */
  sportMet?: boolean;
  /** Posições abaixo da exigida e da expectativa (0 se terminou dentro de uma delas). */
  missBy?: number;
  /** Posições acima da expectativa (campanha melhor que a força do elenco indicava). */
  overBy?: number;
  financeMet?: boolean;
  achievements?: readonly Achievement[];
  /** O clube disputa a divisão mais alta. */
  topDivision?: boolean;
  fired?: boolean;
}

export function clampReputation(value: number): number {
  return Math.min(100, Math.max(1, value));
}

/**
 * Variação de reputação (research.md R9): cumprir a meta vale mais quando o clube está acima do
 * patamar do técnico ou quando a campanha supera a expectativa; perder a meta só custa quando o
 * clube também terminou abaixo da expectativa; ser demitido pesa mais quando o clube está abaixo.
 */
export function reputationDelta(rules: BoardRules, input: ReputationInput): number {
  let delta = 0;
  const over = Math.floor((input.overBy ?? 0) / 2);
  if (input.sportMet === true) {
    delta +=
      rules.metBase +
      over +
      Math.floor((Math.max(0, input.clubReputation - input.reputation) * rules.upsidePct) / 100);
  } else if (input.sportMet === false && (input.missBy ?? 0) > 0) {
    delta -= rules.missBase + Math.floor((input.missBy ?? 0) / 2);
  } else if (input.sportMet === false) {
    // Meta perdida, mas dentro da expectativa do elenco: a reputação não cai.
    delta += over;
  }
  if (input.financeMet === true) delta += 1;
  if (input.financeMet === false) delta -= 1;
  for (const achievement of input.achievements ?? []) {
    if (achievement === "title") delta += rules.titleBonus * (input.topDivision ? 2 : 1);
    if (achievement === "promotion") delta += rules.promotionBonus;
    if (achievement === "relegation") delta -= rules.relegationPenalty;
  }
  if (input.fired) {
    delta -=
      rules.firePenalty +
      Math.floor((Math.max(0, input.reputation - input.clubReputation) * rules.downsidePct) / 100);
  }
  return clampReputation(input.reputation + delta) - input.reputation;
}
