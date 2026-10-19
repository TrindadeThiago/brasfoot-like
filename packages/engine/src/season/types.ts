import type { FormationId } from "../match/formations";
import type { InjurySeverity, MatchEvent, Side, TeamStats } from "../match/types";

export interface DisciplineRules {
  yellowsForSuspension: number;
  matchesPerRed: number;
}

export const DEFAULT_DISCIPLINE_RULES: DisciplineRules = {
  yellowsForSuspension: 3,
  matchesPerRed: 1,
};

export interface SeasonOptions {
  competitionId: string;
  divisionLevel: number;
  seed: string | number;
  rules?: Partial<DisciplineRules>;
  /** Composição da divisão nesta temporada; padrão: a do banco (research.md 007 R4). */
  clubIds?: readonly string[];
  /** Situação inicial dos jogadores, como lesões herdadas da temporada anterior (R7). */
  status?: Record<string, PlayerStatus>;
}

export interface Fixture {
  round: number;
  home: string;
  away: string;
  /** Seed da partida, derivada da seed da temporada (research.md R9). */
  seed: string;
}

export interface Round {
  number: number;
  fixtures: Fixture[];
  /** Clube que folga (só com número ímpar de clubes). */
  bye?: string;
}

export interface PlayerStatus {
  /** Amarelos acumulados (zera ao suspender). */
  yellows: number;
  /** Partidas de suspensão restantes. */
  suspension: number;
  /** Partidas de lesão restantes. */
  injury: number;
}

export interface PlayerLine {
  side: Side;
  minutes: number;
  goals: number;
  assists: number;
  yellows: number;
  red: boolean;
  injury?: InjurySeverity;
}

export interface Absence {
  playerId: string;
  reason: "suspension" | "injury";
  /** Escalado mesmo indisponível, por falta de jogadores (FR-020). */
  fielded: boolean;
}

export interface MatchRecord {
  round: number;
  home: string;
  away: string;
  score: Record<Side, number>;
  outcome: "finished" | "abandoned";
  events: MatchEvent[];
  stats: Record<Side, TeamStats>;
  players: Record<string, PlayerLine>;
  unavailable: Record<Side, Absence[]>;
}

export interface SeasonWarning {
  round: number;
  clubId: string;
  code: "short_squad";
  playerIds: string[];
}

export interface Season {
  competitionId: string;
  divisionLevel: number;
  seed: string | number;
  rules: DisciplineRules;
  clubIds: string[];
  formations: Record<string, FormationId>;
  calendar: Round[];
  /** Próxima rodada a disputar (1..R); R + 1 = encerrada. */
  nextRound: number;
  records: MatchRecord[];
  status: Record<string, PlayerStatus>;
  warnings: SeasonWarning[];
}

export type SeasonStep = { rounds: number } | { toEnd: true };

export type FormResult = "W" | "D" | "L";

export interface StandingRow {
  position: number;
  clubId: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  redCards: number;
  form: FormResult[];
}

export interface PlayerSeasonStats {
  playerId: string;
  clubId: string;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  matchesSuspended: number;
  matchesInjured: number;
}

export interface SeasonReport {
  championId: string;
  championPoints: number;
  lastPoints: number;
  /** Posição do campeão no ranking de força inicial (1 = mais forte). */
  championStrengthRank: number;
  unbeatenClubs: number;
  spearman: number;
  goalsPerMatch: number;
  drawRate: number;
  topScorerGoals: number;
}
