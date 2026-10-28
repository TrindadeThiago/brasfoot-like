import { apportion } from "../continental";

/**
 * Força, reputação e economia por país (024 R6). A força (0,5 a 1,5) é um dado do perfil; daqui
 * saem a escala econômica (salários, público, patrocínio e prêmios), o deslocamento de reputação dos
 * clubes e o peso das vagas continentais. Só soma, multiplicação e divisão: igual em qualquer engine.
 */

export const STRENGTH_RANGE = { min: 0.5, max: 1.5 } as const;

/** Escala econômica do país: de 0,8 (força 0,5) a 1,8 (força 1,5). */
export function economicScale(strength: number): number {
  return 0.6 + 0.8 * strength;
}

/** Reputação do clube deslocada pela força do país (teto 95, piso 5). */
export function shiftedReputation(reputation: number, strength: number): number {
  const factor = 0.75 + 0.25 * strength;
  return Math.max(5, Math.min(95, Math.round(reputation * factor)));
}

/**
 * Peso de cada país nas vagas continentais: o quadrado da força, que dá mais vagas aos fortes sem
 * esconder os fracos (todos têm ao menos uma vaga quando o tamanho da competição deixa).
 */
export function slotWeights(strengths: readonly number[]): number[] {
  return strengths.map((strength) => strength * strength);
}

/** Reparte `total` vagas entre os países pelos pesos, sem passar de `caps`, com mínimo 1 se couber. */
export function continentalSlots(
  total: number,
  strengths: readonly number[],
  caps: readonly number[],
): number[] {
  const weights = slotWeights(strengths);
  const base = caps.map((cap) => Math.min(1, cap));
  const reserved = base.reduce((sum, value) => sum + value, 0);
  if (reserved >= total) return apportion(total, weights, base);
  const rest = apportion(
    total - reserved,
    weights,
    caps.map((cap, index) => cap - (base[index] as number)),
  );
  return rest.map((value, index) => value + (base[index] as number));
}
