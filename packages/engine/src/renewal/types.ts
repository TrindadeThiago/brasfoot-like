import type { Position } from "../model/catalogs";

/** Renovação do mundo (data-model.md da 009). */

export interface WorldMeasure {
  players: number;
  mean: number;
  p10: number;
  p50: number;
  p90: number;
  max: number;
  /** Jogadores com força ≥ STAR_THRESHOLD. */
  stars: number;
  /** Jovens (até REGULATOR_RULES.prospectAge) com potencial ≥ PROSPECT_POTENTIAL. */
  prospects: number;
  meanAge: number;
}

export interface RegulatorState {
  /** Somado à força base dos jovens gerados. */
  strengthOffset: number;
  /** Somado à margem de potencial dos jovens gerados. */
  potentialBonus: number;
  lastMeasure?: WorldMeasure;
}

export interface EvolutionRecord {
  season: number;
  moment: "mid" | "end";
  deltas: Record<string, number>;
  minutes: Record<string, number>;
}

export interface PlayerRef {
  playerId: string;
  displayName: string;
  position: Position;
  age: number;
  strength: number;
}

export interface PlayerDelta extends PlayerRef {
  delta: number;
}

export interface SquadChangeNotice {
  season: number;
  clubId: string;
  retired: PlayerRef[];
  arrived: PlayerRef[];
  released: PlayerRef[];
  promoted: PlayerRef[];
  risers: PlayerDelta[];
  fallers: PlayerDelta[];
}

export interface RenewalState {
  /** Próximo número de id de jogador (`jogador-NNNNN`). */
  nextPlayerSeq: number;
  regulator: RegulatorState;
  lastEvolution?: EvolutionRecord;
  squadNotice?: SquadChangeNotice;
}
