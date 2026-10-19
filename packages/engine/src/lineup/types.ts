/** Jogador impedido de jogar agora: motivo e partidas restantes. */
export interface Unavailability {
  playerId: string;
  /** `left`: aposentado ou dispensado na virada (009); some da escalação com aviso. */
  reason: "injury" | "suspension" | "left";
  remaining: number;
}

/** Ausência por lesão ou suspensão (situação da temporada). */
export type SeasonUnavailability = Unavailability & { reason: "injury" | "suspension" };

export type LineupIssueCode =
  | "empty_slot"
  | "unknown_slot"
  | "duplicate_player"
  | "not_in_squad"
  | "unavailable"
  | "bench_too_large"
  | "unknown_formation"
  | "no_goalkeeper"
  | "short_squad"
  | "out_of_position";

/** `error` impede a partida; `warning` pede confirmação; `info` só informa. */
export type LineupIssueSeverity = "error" | "warning" | "info";

export interface LineupIssue {
  code: LineupIssueCode;
  severity: LineupIssueSeverity;
  slotId?: string;
  playerId?: string;
  params: Record<string, string | number>;
}

export interface LineupValidation {
  /** Nenhum problema com gravidade `error`. */
  valid: boolean;
  issues: LineupIssue[];
}

/** Troca feita pelo ajuste automático antes de uma partida. */
export type LineupChange =
  | {
      kind: "starter_replaced";
      slotId: string;
      outId: string;
      inId: string;
      reason: Unavailability["reason"];
    }
  | { kind: "bench_removed"; outId: string; reason: Unavailability["reason"] }
  | { kind: "short_squad"; fielded: string[] };

/** Lugar na tela de escalação: vaga do esquema, posição no banco ou jogador fora da relação. */
export type Place =
  | { kind: "slot"; slotId: string }
  | { kind: "bench"; index: number }
  | { kind: "out"; playerId: string };
