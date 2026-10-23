import type { CompletedPlayer } from "../model/types";
import type { FormationId, Posture } from "./formations";

export type Side = "home" | "away";
export const SIDES: readonly Side[] = ["home", "away"];

export interface Lineup {
  formation: FormationId;
  posture: Posture;
  /** Vaga do esquema → id do jogador. */
  starters: Record<string, string>;
  bench: string[];
}

export interface TeamInput {
  clubId: string;
  squad: CompletedPlayer[];
  lineup: Lineup;
  /** Lesionados ou suspensos: não podem ser escalados nem entrar. */
  unavailable?: string[];
}

/**
 * Regra de decisão de um jogo eliminatório (018 R8): os gols dos jogos anteriores do confronto e
 * os critérios que valem depois dos 90 minutos. Sem ela, a partida termina nos 90 minutos.
 */
export interface Decider {
  /** Gols de cada lado nos jogos anteriores do confronto (`awayGoals`: os feitos fora de casa). */
  before: Record<Side, { goals: number; awayGoals: number }>;
  /** Gols fora de casa desempatam o agregado. */
  awayGoals: boolean;
  /** Joga a prorrogação se o agregado seguir empatado; senão vai direto aos pênaltis. */
  extraTime: boolean;
}

/**
 * Desgaste dentro da partida (mesmas taxas da condição física, 017 R5): a cada minuto em campo o
 * jogador perde energia e, com ela, rendimento. Sem isto a força fica fixa durante os 90 minutos.
 */
export interface MatchFatigue {
  /** Pontos de energia perdidos por 90 minutos em campo. */
  drainPer90: number;
  /** Perda de força, em pontos-base (1/10000), por ponto de energia perdido na partida. */
  penaltyBpPerPoint: number;
}

export interface MatchInput {
  home: TeamInput;
  away: TeamInput;
  seed: string | number;
  neutral?: boolean;
  substitutionLimit?: number;
  benchLimit?: number;
  /** Jogo eliminatório decidido pelo motor (prorrogação e pênaltis). */
  decider?: Decider;
  /** Fadiga durante a partida; ausente, a força dos jogadores não muda com os minutos. */
  fatigue?: MatchFatigue;
}

/** Entrada com os valores padrão aplicados. */
export interface NormalizedMatchInput extends MatchInput {
  neutral: boolean;
  substitutionLimit: number;
  benchLimit: number;
}

/** Tempo da partida: 1 e 2 são os regulamentares, 3 e 4 os da prorrogação. */
export type MatchHalf = 1 | 2 | 3 | 4;

export interface MatchClock {
  half: MatchHalf;
  minute: number;
  stoppage: number;
}

export type MatchStatus =
  | "not_started"
  | "first_half"
  | "half_time"
  | "second_half"
  | "extra_first_half"
  | "extra_half_time"
  | "extra_second_half"
  | "penalties"
  | "finished"
  | "abandoned";

export type InjurySeverity = "minor" | "moderate" | "severe";

export interface PlayerMatchState {
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  sentOff: boolean;
  injury: InjurySeverity | null;
  subbedIn: number | null;
  subbedOut: number | null;
}

export interface PendingChange {
  reason: "injury" | "goalkeeper_sent_off";
  slotId: string;
  playerId: string;
}

export interface TeamState {
  formation: FormationId;
  posture: Posture;
  /** Vaga → jogador; `null` = vaga vazia (expulsão ou lesão sem troca). */
  onField: Record<string, string | null>;
  bench: string[];
  substitutionsUsed: number;
  players: Record<string, PlayerMatchState>;
  pending: PendingChange[];
}

export type ShotKind = "open" | "header" | "counter" | "free_kick" | "penalty";
export type ShotOutcome = "goal" | "saved" | "blocked" | "off_target";

/** Resultado de uma cobrança de pênalti da disputa. */
export type ShootoutOutcome = "goal" | "saved" | "post" | "off";

export interface ShootoutKick {
  /** Ordem da cobrança na disputa, a partir de 0. */
  order: number;
  side: Side;
  playerId: string;
  outcome: ShootoutOutcome;
}

interface EventBase {
  seq: number;
  half: MatchHalf;
  minute: number;
  stoppage: number;
}

export type MatchEvent = EventBase &
  (
    | {
        type:
          | "kickoff"
          | "half_time"
          | "second_half"
          | "full_time"
          | "extra_time_start"
          | "extra_half_time"
          | "extra_time_end"
          | "shootout_start";
      }
    | {
        type: "shootout_kick";
        side: Side;
        playerId: string;
        outcome: ShootoutOutcome;
        order: number;
      }
    | { type: "shootout_end"; winner: Side }
    | { type: "abandoned"; side: Side }
    | {
        type: "shot";
        side: Side;
        playerId: string;
        kind: ShotKind;
        outcome: ShotOutcome;
        assistId?: string;
        goalkeeperId?: string;
      }
    | { type: "penalty_awarded"; side: Side; playerId: string; foulerId: string }
    | { type: "yellow_card"; side: Side; playerId: string }
    | { type: "red_card"; side: Side; playerId: string; reason: "second_yellow" | "direct" }
    | { type: "injury"; side: Side; playerId: string; severity: InjurySeverity }
    | {
        type: "substitution";
        side: Side;
        outId: string;
        inId: string;
        slotId: string;
        automatic: boolean;
      }
    | { type: "formation_change"; side: Side; formation: FormationId }
    /** Técnico trocou jogadores de posição sem mudar a formação. */
    | { type: "positions_change"; side: Side; moves: PositionMove[] }
    | { type: "posture_change"; side: Side; posture: Posture }
    | { type: "reorganization"; side: Side; playerId: string; fromSlotId: string; toSlotId: string }
  );

export type MatchEventType = MatchEvent["type"];

/** Um jogador que mudou de vaga numa troca de posições (na ordem das vagas da formação). */
export interface PositionMove {
  playerId: string;
  fromSlotId: string;
  toSlotId: string;
}

/** Disputa de pênaltis em andamento ou encerrada. */
export interface ShootoutState {
  /** Quem cobra primeiro. */
  first: Side;
  /** Cobradores de cada lado, em ordem (repete quando acaba). */
  order: Record<Side, string[]>;
  kicks: ShootoutKick[];
  score: Record<Side, number>;
}

/** Como o jogo eliminatório foi decidido (018). */
export interface MatchDecision {
  by: "aggregate" | "away-goals" | "extra-time" | "penalties";
  winner: Side;
  /** Gols feitos só na prorrogação, quando houve. */
  extraTimeScore?: Record<Side, number>;
  shootout?: { kicks: ShootoutKick[]; score: Record<Side, number> };
}

export interface MatchState {
  input: NormalizedMatchInput;
  status: MatchStatus;
  clock: MatchClock;
  stoppage: { first?: number; second?: number };
  score: Record<Side, number>;
  teams: Record<Side, TeamState>;
  events: MatchEvent[];
  /** Soma das frações de posse do mandante por minuto e minutos jogados. */
  possession: { home: number; total: number };
  /** Placar ao fim dos 90 minutos, guardado quando a partida segue para a prorrogação. */
  regulationScore?: Record<Side, number>;
  /** A prorrogação começou: o limite de substituições sobe em um. */
  extraTime?: boolean;
  shootout?: ShootoutState;
  decision?: MatchDecision;
}

export type MatchChange =
  | { type: "substitution"; out: string; in: string; slotId?: string }
  | { type: "formation"; formation: FormationId; assignment: Record<string, string | null> }
  | { type: "posture"; posture: Posture };

export interface TeamStats {
  shots: number;
  shotsOnTarget: number;
  possession: number;
  yellowCards: number;
  redCards: number;
  penalties: number;
  penaltiesScored: number;
}

export interface MatchResult {
  score: Record<Side, number>;
  status: "finished" | "abandoned";
  events: MatchEvent[];
  stats: Record<Side, TeamStats>;
  players: Record<string, PlayerMatchState>;
  /** Presente nos jogos com `decider`: quem avançou e como. */
  decision?: MatchDecision;
}
