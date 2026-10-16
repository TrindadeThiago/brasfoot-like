import type { Posture } from "./formations.js";
import type { InjurySeverity, ShotKind } from "./types.js";

/**
 * Constantes do modelo de partida (research.md R2, R8, R9). Ajustáveis livremente; quem decide se
 * o futebol simulado está crível são `MATCH_REALISM_LIMITS` e os testes de realismo.
 */
export const MATCH_TUNING = {
  /** Probabilidade base de chance por time e minuto, com posse de 50% e forças iguais. */
  chanceRate: 0.11,

  /** Domínio do meio: posse = 0,5 + fator × (meioA − meioB)/(meioA + meioB), limitada. */
  possessionFactor: 1.8,
  possessionClamp: [0.3, 0.7],

  /** Peso do goleiro na defesa que o ataque adversário enfrenta. */
  goalkeeperShareOfDefense: 0.25,

  /** Mando de campo: multiplicador da taxa de chances. */
  home: { home: 1.2, away: 0.9 },

  /** Postura: multiplica as chances do próprio time e as que ele concede. */
  posture: {
    defensive: { own: 0.82, conceded: 0.85 },
    balanced: { own: 1, conceded: 1 },
    attacking: { own: 1.2, conceded: 1.15 },
  } satisfies Record<Posture, { own: number; conceded: number }>,

  /** Time que perde no 2º tempo depois deste minuto se lança ao ataque. */
  trailingPush: { fromMinute: 70, own: 1.15, conceded: 1.05 },

  /** Time que vence por esta margem ou mais tira o pé. */
  comfortableLead: { margin: 3, own: 0.75 },

  /** Pesos dos tipos de chance. */
  chanceKinds: { open: 60, header: 20, counter: 13, free_kick: 6, penalty: 1.3 } satisfies Record<
    ShotKind,
    number
  >,

  /** Probabilidade de haver assistência, por tipo de chance. */
  assistChance: {
    open: 0.7,
    header: 0.85,
    counter: 0.75,
    free_kick: 0,
    penalty: 0,
  } satisfies Record<ShotKind, number>,

  /** Desfecho: bloqueio e para fora (o resto vai no alvo), por tipo de chance. */
  outcome: {
    blocked: { open: 0.24, header: 0.12, counter: 0.15, free_kick: 0.3, penalty: 0 },
    offTarget: { open: 0.38, header: 0.45, counter: 0.33, free_kick: 0.4, penalty: 0.06 },
    /** Probabilidade de gol num chute no alvo, com finalizador e goleiro iguais. */
    goal: { open: 0.255, header: 0.255, counter: 0.31, free_kick: 0.21, penalty: 0.84 },
  } satisfies Record<string, Record<ShotKind, number>>,

  /** Efeitos das características (multiplicadores). */
  traits: {
    finisherConversion: 1.15,
    headingChanceWeight: 0.25,
    headingConversion: 1.15,
    headingDefense: 0.9,
    wallSave: 1.15,
    wallBlock: 1.15,
    freeKickConversion: 1.3,
    paceChanceWeight: 0.15,
    playmakerChanceRate: 0.04,
    playmakerAssistWeight: 2,
  } satisfies Record<string, number>,

  /** Peso de finalização por posição da vaga. */
  shooterWeight: { GK: 0.01, CB: 0.3, FB: 0.4, DM: 0.55, MF: 1.2, FW: 1.8 },
  /** Peso de assistência por posição da vaga. */
  assistWeight: { GK: 0.05, CB: 0.25, FB: 0.9, DM: 0.7, MF: 1.4, FW: 1 },
  /** Peso de falta por posição da vaga. */
  foulWeight: { GK: 0.15, CB: 1.3, FB: 1.1, DM: 1.4, MF: 0.9, FW: 0.7 },

  /** Disciplina e lesões, por time e minuto. */
  yellowRate: 0.024,
  directRedRate: 0.0003,
  injuryRate: 0.0016,
  injurySeverity: { minor: 60, moderate: 30, severe: 10 } satisfies Record<InjurySeverity, number>,

  /** Jogador já amarelado comete menos faltas (joga com cautela). */
  cautionAfterYellow: 0.2,
  /** Peso individual a partir de temperamento/propensão (1–100): 0,15 + valor/40. */
  attributeWeight: { base: 0.15, divisor: 40 },

  /** Acréscimos (research.md R8). */
  stoppage: {
    base: 1,
    perGoal: 0.5,
    perInjury: 1,
    perSubstitution: 0.5,
    perCard: 0.3,
    randomExtra: [0, 2],
    firstHalf: [0, 5],
    secondHalf: [1, 8],
  },

  /** Partida encerrada quando um time fica com menos jogadores que isto. */
  minimumPlayers: 7,
  abandonedScore: 3,
} as const satisfies { traits: Record<string, number>; [key: string]: unknown };
