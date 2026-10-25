import type { Bracket } from "../knockout/types";
import type { DrawAttribute } from "../model/catalogs";
import type { KnockoutFormat } from "../model/types";
import type { StandingRow } from "../season/types";

/** Tipos de estado de uma divisão disputada em fases (019 data-model.md §2–3). */

export type StageKind = "league" | "groups" | "knockout";

/** Um grupo sorteado de uma fase de grupos; `id` é uma letra (`A`, `B`, …). */
export interface GroupState {
  id: string;
  clubIds: string[];
}

/** Regra de separação que o sorteio teve de afrouxar (019 R6). */
export interface DrawRuleRef {
  kind: "separate";
  attribute: DrawAttribute;
}

/** Aviso de um sorteio que não conseguiu respeitar uma separação: quais clubes ficaram juntos. */
export interface DrawWarning {
  stage: number;
  rule: DrawRuleRef;
  clubIds: string[];
}

/** Uma fase da sequência de uma `Season`: quem a disputa, quando e o que é próprio do tipo. */
export interface StageState {
  index: number;
  kind: StageKind;
  /** Participantes definidos e `fixtures` das rodadas preenchidas. */
  started: boolean;
  /** Participantes, em ordem de id; vazio até a fase começar. */
  clubIds: string[];
  /** Rodadas absolutas da fase em `Season.calendar`. */
  rounds: number[];
  /** Só em fases de grupos, depois do sorteio. */
  groups?: GroupState[];
  /** Só em fases de grupos: separações afrouxadas pelo sorteio. */
  warnings?: DrawWarning[];
  /** Só em fases eliminatórias. */
  bracket?: Bracket;
  /** Clubes que chegam por ligação, selados ao fim da fase de origem (022 R3). */
  incoming?: { dropInId: string; clubIds: string[] }[];
}

/**
 * Informação de uma "visão" da fase eliminatória sobre uma `Season` (019 R3): o formato da fase e
 * a classificação geral da fase de pontos anterior. Transitória: nunca é gravada no save.
 */
export interface CupViewInfo {
  stage: number;
  format: KnockoutFormat;
  /** Posição de cada clube na classificação geral da fase de pontos anterior. */
  ranks: Record<string, number>;
}

/** Marca de um jogo numa divisão em fases. */
export interface FixtureStage {
  index: number;
  kind: StageKind;
  group?: string;
}

/** Linha da classificação geral de uma fase de grupos. */
export interface OverallRow extends StandingRow {
  group: string;
  groupPosition: number;
}

/** Clube que se classificou de uma fase de pontos para a seguinte. */
export interface Qualifier {
  clubId: string;
  group?: string;
  /** Posição no grupo (ou na tabela, numa fase de pontos corridos); parte de 1. */
  groupPosition: number;
  /** Posição na classificação geral da fase; parte de 1. */
  overallPosition: number;
  /** Entrou por vaga extra. */
  extra: boolean;
}

/** De onde vem a vaga de um clube numa fase eliminatória. */
export type Origin = { group: string; position: number } | { table: number } | { extra: number };
