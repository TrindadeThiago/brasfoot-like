import type { Side } from "./types.js";

/** Códigos de erro do motor de partida e seus parâmetros (contracts/match-errors.md). */
export const MATCH_ERROR_PARAMS = {
  "input.same_club": ["clubId"],
  "input.invalid_option": ["option", "value", "min", "max"],
  "lineup.unknown_formation": ["formation"],
  "lineup.slots_mismatch": ["expected", "received"],
  "lineup.duplicate_player": ["playerId"],
  "lineup.player_not_in_squad": ["playerId"],
  "lineup.player_in_both_teams": ["playerId"],
  "lineup.bench_too_large": ["count", "max"],
  "lineup.player_unavailable": ["playerId"],
  "change.match_finished": [],
  "change.not_started": [],
  "change.limit_reached": ["limit"],
  "change.player_not_on_field": ["playerId"],
  "change.player_not_on_bench": ["playerId"],
  "change.player_unavailable": ["playerId"],
  "change.unknown_slot": ["slotId"],
  "change.invalid_assignment": ["formation"],
  "auto_lineup.not_enough_players": ["available", "required"],
} as const satisfies Record<string, readonly string[]>;

export type MatchErrorCode = keyof typeof MATCH_ERROR_PARAMS;
export const MATCH_ERROR_CODES = Object.keys(MATCH_ERROR_PARAMS) as MatchErrorCode[];

export interface MatchError {
  code: MatchErrorCode;
  side?: Side;
  params: Record<string, string | number>;
}

export function matchError(
  code: MatchErrorCode,
  params: Record<string, string | number> = {},
  side?: Side,
): MatchError {
  return side === undefined ? { code, params } : { code, side, params };
}
