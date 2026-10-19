import type { Position } from "../model/catalogs";

/**
 * Regras de evolução e renovação (research.md R4–R8). Constantes versionadas: quem decide se o
 * mundo continua crível são os limites do teste de 30 temporadas (renewal/long-run.test.ts).
 */

/**
 * Limiar de "craque" dos critérios de aceite (research.md R1, R9): ponta da distribuição inicial
 * (máximo 82). Revisado de 80 para 78 na calibração: as gerações vêm em ondas e, entre duas, o
 * melhor jogador do mundo pode ficar em 79 por uma ou duas temporadas.
 */
export const STAR_THRESHOLD = 78;

/** Potencial que conta um jovem como promessa de craque para o regulador. */
export const PROSPECT_POTENTIAL = 80;

export const EVOLUTION_RULES = {
  /** Taxa de crescimento por evolução (meia temporada): [idade máxima, fração da margem]. */
  growth: [
    [19, 0.2],
    [21, 0.16],
    [23, 0.12],
    [26, 0.08],
  ] as const,
  /** Fator de minutagem = base + peso × participação (0..1). */
  minutes: { base: 0.5, weight: 1.0 },
  /** Idade a partir da qual começa o declínio. */
  declineFrom: 31,
  /** Declínio por evolução = base + porAno × (idade − declineFrom). */
  decline: { base: 0.6, perYear: 0.45 },
  /** Ruído triangular simétrico em [−noise, +noise]. */
  noise: 1.5,
  /** Ruído menor no auge (27–30). */
  primeNoise: 1,
  minStrength: 20,
  maxStrength: 99,
};

export const RETIREMENT_RULES = {
  minAge: 33,
  base: 0.15,
  perYear: 0.12,
  /** A partir desta idade, a aposentadoria é certa. */
  certainAge: 38,
};

export const YOUTH_RULES = {
  /** Jovens por clube: base + 1 por limiar de reputação atingido. */
  perClub: { base: 1, reputationSteps: [45, 70] },
  age: [16, 18] as const,
  /** Força = base + porReputação × rep + offset do regulador ± ruído. */
  strength: { base: 41, perReputation: 0.12, noise: 6 },
  /** Margem de potencial uniforme (+ bônus do regulador). */
  potentialMargin: [10, 30] as const,
};

export const SQUAD_RULES = {
  min: 22,
  max: 28,
  positionMin: { GK: 3, FB: 3, CB: 3, DM: 2, MF: 3, FW: 3 } satisfies Record<Position, number>,
  /** Utilidade para dispensa: força + youthWeight × margem (idade ≤ youthAge) − agePenalty × anos acima de 30. */
  utility: { youthAge: 22, youthWeight: 0.5, ageFrom: 30, agePenalty: 2 },
};

export const REGULATOR_RULES = {
  targetMean: 59,
  gain: 0.3,
  maxStep: 1,
  /** Fração do offset de força que se perde a cada temporada (amortece a oscilação). */
  leak: 0.15,
  offsetRange: [-8, 8] as const,
  /** Faixa-alvo de jovens (≤ prospectAge) com potencial de craque (mundo inicial: 17). */
  prospectAge: 24,
  prospectsRange: [15, 35] as const,
  /** Passo do bônus de potencial quando a promessa de craques sai da faixa. */
  prospectsStep: 1,
  potentialBonusRange: [-5, 10] as const,
};
