import type { Position } from "../model/catalogs";

/** Camada de um clube pela reputação: grande ≥ 75, médio 55–74, pequeno < 55. */
export const REPUTATION_TIERS = { big: 75, medium: 55 } as const;

export function tierOf(reputation: number): "big" | "medium" | "small" {
  if (reputation >= REPUTATION_TIERS.big) return "big";
  if (reputation >= REPUTATION_TIERS.medium) return "medium";
  return "small";
}

/**
 * Limites verificáveis do mundo gerado (FR-030 a FR-036), checados para várias seeds por
 * `distribution.test.ts` (Princípio V). Afrouxar um limite exige justificativa registrada.
 */
export const DISTRIBUTION_LIMITS = {
  /** FR-030: tamanho do elenco e quantidade por posição. */
  squadSize: [23, 28],
  positions: {
    GK: [3, 3],
    FB: [4, 5],
    CB: [4, 5],
    DM: [3, 5],
    MF: [4, 6],
    FW: [4, 5],
  } satisfies Record<Position, readonly [number, number]>,

  /** FR-031: camadas por reputação. */
  serieABig: [4, 6],
  serieAMedium: [8, 10],
  serieBMaxBig: 2,

  /** FR-032: escala "contida" de força. */
  meanStrength: [55, 65],
  starThreshold: 85,
  maxStarShare: 0.02,
  midRange: [45, 70],
  minMidShare: 0.5,
  minStrength: 20,

  /** FR-033: hierarquia, pela média dos 16 melhores de cada clube. */
  topN: 16,
  // Relaxados de 5 e 8 na feature 003: a hierarquia anterior deixava a temporada previsível
  // demais (campeão com até 99 pontos). Ver specs/003-temporada-pontos-corridos/research.md R12.
  minGapSerieAOverB: 4,
  minGapBigOverSmallInA: 5.5,

  /** FR-034: idades. */
  ageRange: [16, 37],
  meanAge: [24, 28],

  /** FR-035: margem de potencial dos jovens (após completar os atributos ocultos). */
  youngMaxAge: 21,
  minYoungPotentialGap: 8,

  /** FR-036: características. */
  traitShareAtLeastOne: [0.4, 0.7],
  maxTraitShareTwo: 0.15,
} as const;
