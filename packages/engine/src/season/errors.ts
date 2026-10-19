/** Códigos de erro da temporada e seus parâmetros (contracts/season-errors.md). */
export const SEASON_ERROR_PARAMS = {
  "season.unknown_competition": ["competitionId"],
  "season.unknown_division": ["competitionId", "level"],
  "season.unsupported_format": ["format"],
  "season.too_few_clubs": ["count"],
  "season.invalid_rules": ["rule", "value", "min", "max"],
  "season.lineup_unavailable": ["clubId", "playerId"],
  "season.invalid_lineup": ["clubId", "matchErrorCode"],
  "season.lineup_not_playing": ["clubId", "round"],
  "season.invalid_composition": ["level", "reason"],
  "turnover.season_not_over": ["round"],
  "turnover.invalid_steps": ["stepId", "reason"],
  "turnover.invalid_result": ["reason"],
} as const satisfies Record<string, readonly string[]>;

export type SeasonErrorCode = keyof typeof SEASON_ERROR_PARAMS;
export const SEASON_ERROR_CODES = Object.keys(SEASON_ERROR_PARAMS) as SeasonErrorCode[];

export interface SeasonError {
  code: SeasonErrorCode;
  params: Record<string, string | number>;
}

export function seasonError(
  code: SeasonErrorCode,
  params: Record<string, string | number> = {},
): SeasonError {
  return { code, params };
}
