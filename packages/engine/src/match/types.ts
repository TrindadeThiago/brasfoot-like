import type { CompletedPlayer } from "../model/types.js";
import type { FormationId, Posture } from "./formations.js";

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

export interface MatchInput {
  home: TeamInput;
  away: TeamInput;
  seed: string | number;
  neutral?: boolean;
  substitutionLimit?: number;
  benchLimit?: number;
}

/** Entrada com os valores padrão aplicados. */
export interface NormalizedMatchInput extends MatchInput {
  neutral: boolean;
  substitutionLimit: number;
  benchLimit: number;
}

export interface MatchClock {
  half: 1 | 2;
  minute: number;
  stoppage: number;
}

export type MatchStatus =
  | "not_started"
  | "first_half"
  | "half_time"
  | "second_half"
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

interface EventBase {
  seq: number;
  half: 1 | 2;
  minute: number;
  stoppage: number;
}

export type MatchEvent = EventBase &
  (
    | { type: "kickoff" | "half_time" | "second_half" | "full_time" }
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
    | { type: "posture_change"; side: Side; posture: Posture }
    | { type: "reorganization"; side: Side; playerId: string; fromSlotId: string; toSlotId: string }
  );

export type MatchEventType = MatchEvent["type"];

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
}
