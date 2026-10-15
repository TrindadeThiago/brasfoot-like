import type { Position, Trait } from "../model/catalogs.js";

export type Tier = "big" | "medium" | "small";
export type Range = readonly [number, number];

/**
 * Constantes de calibragem do gerador (research.md R12). Podem ser ajustadas livremente; quem
 * decide se o mundo está crível são os limites de `DISTRIBUTION_LIMITS` e seus testes.
 */
export const GENERATOR_TUNING = {
  referenceDate: "2027-01-01",
  clubsPerDivision: 20,
  promotionRelegationSlots: 4,

  /** Quantos clubes de cada camada por divisão; o restante é "small". */
  tierCounts: {
    serieA: { big: [4, 6], medium: [8, 10] },
    serieB: { big: [0, 1], medium: [4, 6] },
  },

  /** Faixas de reputação por divisão e camada. */
  reputation: {
    serieA: { big: [78, 95], medium: [56, 74], small: [40, 54] },
    serieB: { big: [72, 80], medium: [44, 58], small: [25, 43] },
  },

  /** Nível técnico do clube ≈ média dos 16 melhores: base + fator × reputação ± ruído. */
  clubLevel: { base: 39, perReputation: 0.42, noise: 3 },

  /** Composição do elenco: mínimo e máximo por posição e total (FR-030). */
  squad: {
    total: [23, 28],
    min: { GK: 3, FB: 4, CB: 4, DM: 3, MF: 4, FW: 4 },
    max: { GK: 3, FB: 5, CB: 5, DM: 5, MF: 6, FW: 5 },
    /** Titulares por posição (11 no total) e reservas imediatos por posição. */
    starters: { GK: 1, FB: 2, CB: 2, DM: 1, MF: 3, FW: 2 },
    reserves: { GK: 1, FB: 1, CB: 1, DM: 1, MF: 1, FW: 1 },
  },

  /** Deslocamento de força pelo papel no elenco. */
  roleOffset: { starter: 4, reserve: -1, extra: -6 },

  /** Ruído de força (desvio máximo, forma de sino) e limites absolutos. */
  strengthNoise: 10,
  strengthClamp: [20, 99],

  /** Craques: chance de um titular receber um bônus de força, por camada. */
  star: { chance: { big: 0.06, medium: 0.015, small: 0 }, bonus: [7, 12] },

  /** Idade (triangular): titulares/reservas e demais jogadores (mais jovens). */
  age: {
    core: { min: 18, mode: 27, max: 36 },
    extra: { min: 17, mode: 20, max: 30 },
  },

  /** Deslocamento de força por idade: [idade máxima inclusiva, deslocamento]. */
  ageOffset: [
    [19, -7],
    [21, -4],
    [23, -1],
    [30, 0],
    [32, -1],
    [34, -3],
    [99, -5],
  ],

  /** Características: chance de ter ao menos 1, chance de ter 2 dado que tem 1, pesos. */
  traits: {
    chanceAtLeastOne: 0.55,
    chanceSecond: 0.18,
    weights: {
      GK: { wall: 1 },
      FB: { pace: 4, playmaker: 1, "free-kick": 1, heading: 1 },
      CB: { wall: 3, heading: 4, pace: 1 },
      DM: { wall: 2, playmaker: 2, heading: 1, "free-kick": 1 },
      MF: { playmaker: 4, "free-kick": 3, pace: 2, finisher: 1 },
      FW: { finisher: 5, pace: 3, heading: 2, "free-kick": 1 },
    },
  },

  /** Atributos ocultos: margem de potencial sobre a força por idade ([idade máxima, faixa]). */
  hidden: {
    potentialMargin: [
      [18, [10, 25]],
      [21, [6, 18]],
      [24, [2, 10]],
      [27, [0, 5]],
      [99, [0, 2]],
    ],
  },

  /** Estádio (lugares) e caixa inicial por camada. */
  stadium: { big: [40000, 80000], medium: [15000, 40000], small: [5000, 18000] },
  cashPerReputationSquared: [800, 1400],

  /** Paleta de cores dos clubes. */
  palette: [
    "#C8102E",
    "#0033A0",
    "#006B3F",
    "#FFD100",
    "#000000",
    "#FFFFFF",
    "#7A1F3D",
    "#00A3E0",
    "#F47920",
    "#5B2C83",
    "#8B5A2B",
    "#9EA2A2",
    "#004C45",
    "#1D428A",
  ],
} as const satisfies {
  tierCounts: Record<string, Record<"big" | "medium", Range>>;
  reputation: Record<string, Record<Tier, Range>>;
  squad: {
    total: Range;
    min: Record<Position, number>;
    max: Record<Position, number>;
    starters: Record<Position, number>;
    reserves: Record<Position, number>;
  };
  traits: {
    chanceAtLeastOne: number;
    chanceSecond: number;
    weights: Record<Position, Partial<Record<Trait, number>>>;
  };
  [key: string]: unknown;
};
