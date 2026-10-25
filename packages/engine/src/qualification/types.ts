import type { Berth, BerthSource } from "../model/types";

/** Por que uma vaga foi repassada (021 R3). */
export type PassReason = "duplicate" | "ineligible" | "require" | "forbid";

/** Como um participante chegou à competição (021 R7). */
export type Origin =
  | { kind: "bank" }
  | { kind: "stay" }
  | { kind: "promotion" }
  | { kind: "relegation" }
  | {
      kind: "berth";
      berthId: string;
      source: BerthSource["kind"];
      /** Competição de origem da vaga. */
      from: string;
      /** Posição final na competição de origem, quando a fonte é uma posição. */
      position?: number;
    }
  | { kind: "pass"; berthId: string; fromClubId: string; reason: PassReason }
  /** Chegou durante a temporada por ligação entre competições (022 R3). */
  | { kind: "dropIn"; dropInId: string; from: string; position?: number };

/** Fase de entrada de um clube que não começa na primeira (números a partir de 1). */
export interface Entry {
  stage?: number | undefined;
  phase?: number | undefined;
}

export interface QualificationEntry {
  competitionId: string;
  level: number;
  berthId: string;
  clubId: string;
  via: "direct" | "pass";
  passedFrom?: { clubId: string; reason: PassReason };
}

/** Classificações resolvidas ao fim de uma temporada (guardado no histórico). */
export interface QualificationRecord {
  number: number;
  year: number;
  entries: QualificationEntry[];
}

export interface QualificationResult {
  /** Clubes de cada nível na próxima temporada, só das competições com vagas. */
  compositions: Record<string, Record<number, string[]>>;
  /** Clubes que entram numa fase que não é a primeira (competição → nível → clube). */
  entrants: Record<string, Record<number, Record<string, Entry>>>;
  origins: Record<string, Record<string, Origin>>;
  record: QualificationRecord;
}

/** Faixa de posições de uma divisão que dá vaga em outra competição (021 R7). */
export interface BerthZone {
  from: number;
  to: number;
  competitionId: string;
  level: number;
  entry?: Entry;
  berthId: string;
}

export type { Berth, BerthSource };
