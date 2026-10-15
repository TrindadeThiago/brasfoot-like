import { ageOn } from "../calendar/date.js";
import type { Club, CompletedPlayer } from "../model/types.js";

/**
 * Salário e valor de mercado derivados (FR-016, research.md R13). Regra provisória, recalibrada
 * na feature de finanças; aqui só precisa ser determinística, positiva e crescente com a força.
 * Só aritmética exata: potência cúbica por multiplicação explícita, fatores em porcentagem.
 */

/** Fator de idade sobre o valor de mercado, em %: [idade máxima, fator]. */
const AGE_VALUE_FACTOR: readonly (readonly [number, number])[] = [
  [21, 130],
  [24, 120],
  [28, 100],
  [31, 80],
  [33, 55],
  [99, 35],
];
const YOUNG_POTENTIAL_MAX_AGE = 23;
const POTENTIAL_BONUS_PER_POINT = 2;

function cubic(strength: number): number {
  return strength * strength * strength;
}

function reputationFactor(club: Club): number {
  return 80 + club.reputation * 0.4;
}

function ageFactor(age: number): number {
  for (const [maxAge, factor] of AGE_VALUE_FACTOR) {
    if (age <= maxAge) return factor;
  }
  return 35;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Valor de mercado na moeda do jogo, múltiplo de 1.000. */
export function deriveMarketValue(
  player: CompletedPlayer,
  club: Club,
  referenceDate: string,
): number {
  const age = ageOn(player.birthDate, referenceDate);
  const potentialBonus =
    age <= YOUNG_POTENTIAL_MAX_AGE
      ? (player.hidden.potential - player.strength) * POTENTIAL_BONUS_PER_POINT
      : 0;
  const value =
    ((((cubic(player.strength) * 20 * ageFactor(age)) / 100) * (100 + potentialBonus)) / 100) *
    (reputationFactor(club) / 100);
  return Math.max(1000, roundTo(value, 1000));
}

/** Salário mensal na moeda do jogo, múltiplo de 100. */
export function deriveWage(player: CompletedPlayer, club: Club, _referenceDate: string): number {
  const wage = (cubic(player.strength) / 10) * (reputationFactor(club) / 100);
  return Math.max(500, roundTo(wage, 100));
}
