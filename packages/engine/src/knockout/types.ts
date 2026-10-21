import type { Side } from "../match/types";

export type { KnockoutEntry, KnockoutFormat, KnockoutPhase } from "../model/types";

/** Confronto sorteado de uma fase (018 data-model.md); os resultados são derivados dos registros. */
export interface Tie {
  id: string;
  home: string;
  away: string;
}

export interface BracketPhase {
  index: number;
  /** A fase já foi sorteada e as `fixtures` das suas rodadas estão preenchidas. */
  drawn: boolean;
  /** Números das rodadas (pernas) da fase no calendário da temporada. */
  rounds: number[];
  ties: Tie[];
}

export interface Bracket {
  phases: BracketPhase[];
}

export type TieDecidedBy = "aggregate" | "away-goals" | "extra-time" | "penalties";

/** Situação de um confronto, derivada dos registros da temporada. */
export interface TieState {
  id: string;
  /** Clubes do confronto (o mandante da ida e o visitante da ida). */
  home: string;
  away: string;
  legs: 1 | 2;
  /** Jogos já disputados. */
  played: number;
  /** Gols de cada clube no agregado até agora. */
  goals: Record<Side, number>;
  decided: boolean;
  winner?: string;
  loser?: string;
  decidedBy?: TieDecidedBy;
}
