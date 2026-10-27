import type { Club, Competition } from "../model/types";

/** Peso do estadual sem `regional.weight`: igual a uma competição comum (100%). */
export const REGIONAL_DEFAULT_WEIGHT = 100;

/**
 * Peso do estadual para um clube, em % (023 R7): `weight.pct` (padrão 100) e, se houver, a faixa de
 * reputação mais alta que o clube alcança (`byReputation`, em ordem crescente) troca esse valor.
 * Metas da diretoria, avaliação e humor da torcida multiplicam seus efeitos por ele. 0 não gera
 * efeito algum.
 */
export function regionalWeightFor(
  club: Pick<Club, "reputation">,
  competition: Pick<Competition, "regional">,
): number {
  const weight = competition.regional?.weight;
  let pct = weight?.pct ?? REGIONAL_DEFAULT_WEIGHT;
  for (const band of weight?.byReputation ?? []) {
    if (club.reputation >= band.from) pct = band.pct;
  }
  return pct;
}

/** Aplica o peso (em %) a um valor inteiro, arredondando para zero. */
export function weighted(amount: number, pct: number): number {
  return Math.trunc((amount * pct) / 100);
}
