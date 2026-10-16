import type { Position } from "../model/catalogs.js";
import type { CompletedPlayer } from "../model/types.js";
import { adequacy } from "./adequacy.js";
import { FORMATIONS, type FormationId } from "./formations.js";

export interface SectorWeights {
  goalkeeper: number;
  defense: number;
  midfield: number;
  attack: number;
}

export type Sector = keyof SectorWeights;
export const SECTORS: readonly Sector[] = ["goalkeeper", "defense", "midfield", "attack"];

/** Quanto cada posição de vaga alimenta cada setor (research.md R3). */
export const SECTOR_WEIGHTS: Record<Position, SectorWeights> = {
  GK: { goalkeeper: 1, defense: 0, midfield: 0, attack: 0 },
  CB: { goalkeeper: 0, defense: 1, midfield: 0, attack: 0 },
  FB: { goalkeeper: 0, defense: 0.6, midfield: 0.3, attack: 0.1 },
  DM: { goalkeeper: 0, defense: 0.5, midfield: 0.5, attack: 0 },
  MF: { goalkeeper: 0, defense: 0, midfield: 0.7, attack: 0.3 },
  FW: { goalkeeper: 0, defense: 0, midfield: 0.1, attack: 0.9 },
};

/** Peso total de uma vaga (soma dos setores), usado também pela escalação automática. */
export function slotWeight(position: Position): number {
  const weights = SECTOR_WEIGHTS[position];
  return weights.goalkeeper + weights.defense + weights.midfield + weights.attack;
}

export interface TeamStrength extends SectorWeights {
  overall: number;
}

export interface StrengthInput {
  formation: FormationId;
  onField: Readonly<Record<string, CompletedPlayer | null | undefined>>;
}

/** Contribuição de um jogador numa vaga: força × adequação à posição da vaga. */
export function effectiveStrength(player: CompletedPlayer, slotPositionValue: Position): number {
  return player.strength * adequacy(player.position, slotPositionValue);
}

interface SlotWeights {
  id: string;
  position: Position;
  goalkeeper: number;
  defense: number;
  midfield: number;
  attack: number;
}

interface FormationWeights {
  slots: SlotWeights[];
  totals: SectorWeights;
}

/** Pesos de cada vaga e totais do esquema completo, calculados uma vez por esquema. */
const FORMATION_WEIGHTS = new Map<FormationId, FormationWeights>();

function weightsOf(formation: FormationId): FormationWeights {
  let weights = FORMATION_WEIGHTS.get(formation);
  if (!weights) {
    const totals: SectorWeights = { goalkeeper: 0, defense: 0, midfield: 0, attack: 0 };
    const slots = FORMATIONS[formation].slots.map((slot) => {
      const w = SECTOR_WEIGHTS[slot.position];
      totals.goalkeeper += w.goalkeeper;
      totals.defense += w.defense;
      totals.midfield += w.midfield;
      totals.attack += w.attack;
      return { id: slot.id, position: slot.position, ...w };
    });
    weights = { slots, totals };
    FORMATION_WEIGHTS.set(formation, weights);
  }
  return weights;
}

const share = (total: number, weight: number) => (weight > 0 ? total / weight : 0);

/**
 * Força de cada setor = soma ponderada das contribuições ÷ soma dos pesos do esquema completo.
 * Uma vaga vazia (expulsão, lesão sem troca) reduz o setor proporcionalmente (FR-010).
 * `playerAt` devolve o jogador de cada vaga (ou nada, se vazia).
 */
export function computeStrength(
  formation: FormationId,
  playerAt: (slotId: string) => CompletedPlayer | null | undefined,
): TeamStrength {
  const { slots, totals } = weightsOf(formation);
  let goalkeeper = 0;
  let defense = 0;
  let midfield = 0;
  let attack = 0;
  for (const slot of slots) {
    const player = playerAt(slot.id);
    if (!player) continue;
    const value = effectiveStrength(player, slot.position);
    goalkeeper += value * slot.goalkeeper;
    defense += value * slot.defense;
    midfield += value * slot.midfield;
    attack += value * slot.attack;
  }
  const strength = {
    goalkeeper: share(goalkeeper, totals.goalkeeper),
    defense: share(defense, totals.defense),
    midfield: share(midfield, totals.midfield),
    attack: share(attack, totals.attack),
    overall: 0,
  };
  strength.overall =
    0.1 * strength.goalkeeper +
    0.3 * strength.defense +
    0.3 * strength.midfield +
    0.3 * strength.attack;
  return strength;
}

export function teamStrength({ formation, onField }: StrengthInput): TeamStrength {
  return computeStrength(formation, (slotId) => onField[slotId]);
}
