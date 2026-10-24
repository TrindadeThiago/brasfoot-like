/**
 * Problemas de validação: código + parâmetros, sem texto (Princípio VII). As mensagens ficam no
 * pacote de i18n. Catálogo completo em contracts/validation-errors.md.
 */
export type Severity = "error" | "warning";

export const SECTIONS = [
  "manifest",
  "countries",
  "competitions",
  "clubs",
  "players",
  "rivalries",
  "package",
  "images",
] as const;
export type Section = (typeof SECTIONS)[number];

/** Parâmetros de cada código, na ordem do contrato. */
export const ISSUE_PARAMS = {
  "schema.required": ["field"],
  "schema.unknown_field": ["field"],
  "schema.invalid_type": ["field", "expected", "received"],
  "schema.out_of_range": ["field", "min", "max", "value"],
  "schema.invalid_length": ["field", "min", "max", "length"],
  "schema.invalid_format": ["field", "format", "value"],
  "schema.invalid_value": ["field", "value", "allowed"],
  "schema.not_integer": ["field", "value"],
  "manifest.unsupported_format_version": ["found", "supported"],
  "format.unsupported": ["type"],
  "format.points_order": ["win", "draw", "loss"],
  "format.duplicate_tiebreaker": ["tiebreaker"],
  "unique.duplicate_id": ["id", "otherSection", "otherIndex"],
  "unique.duplicate_abbreviation": ["abbreviation", "otherClubId"],
  "unique.duplicate_country_code": ["code", "otherCountryId"],
  "ref.country_not_found": ["field", "countryId"],
  "ref.club_not_found": ["clubId"],
  "division.levels_not_contiguous": ["levels"],
  "division.club_count": ["count", "min", "max"],
  "division.duplicate_club": ["clubId"],
  "division.club_in_multiple": ["clubId", "otherCompetitionId", "otherLevel"],
  "calendar.club_double_booked": ["competitionId", "otherCompetitionId", "clubId", "date"],
  "calendar.competition_overflow": ["competitionId", "needed", "available"],
  "knockout.phase_count": ["phase", "count", "delta"],
  "knockout.entry_phase": ["phase", "phases"],
  "knockout.entry_duplicate": ["clubId"],
  "knockout.entry_not_participant": ["clubId"],
  "knockout.no_decider": ["phase"],
  "knockout.neutral_two_legs": ["phase"],
  "knockout.single_division": ["divisions"],
  "stages.gap_conflict": ["competitionId"],
  "stages.group_size_mismatch": ["stage", "clubs", "groupSize"],
  "stages.group_count": ["stage", "groups"],
  "stages.qualify_range": ["stage", "qualified", "max"],
  "stages.extra_exceeds_groups": ["stage", "extra", "groups"],
  "stages.qualify_mismatch": ["stage", "qualifying", "next", "nextClubs"],
  "stages.qualified_without_next": ["stage"],
  "stages.knockout_count": ["stage", "phase", "count", "delta"],
  "stages.enter_unknown_club": ["stage", "clubId"],
  "stages.enter_first_stage": ["stage", "clubId"],
  "stages.enter_duplicate": ["stage", "clubId"],
  "stages.pots_range": ["stage", "pots", "groupSize"],
  "stages.pot_size": ["stage", "pot", "clubs", "groups"],
  "stages.rule_exempt_pot": ["stage", "pot", "pots"],
  "stages.separation_impossible": ["stage", "attribute", "value", "clubs", "groups"],
  "stages.pairs_invalid": ["stage", "origin"],
  "stages.relegation_exceeds_eliminated": ["level", "relegation", "eliminated"],
  "competition.club_outside_main": ["clubId", "competitionId"],
  "country.main_not_league": ["countryId", "competitionId"],
  "country.names_missing": ["countryId"],
  "country.foreign_limit_exceeded": ["clubId", "limit", "count"],
  "unique.duplicate_club_in_country": ["clubId", "otherCompetitionId"],
  "division.top_has_promotion": ["slots"],
  "division.bottom_has_relegation": ["slots"],
  "division.slots_mismatch": ["level", "relegated", "nextLevel", "promoted"],
  "division.slots_exceed_clubs": ["level", "slots", "clubs"],
  "economy.price_range": ["min", "max"],
  "country.names_too_few": ["kind", "count", "min"],
  "economy.unknown_division": ["level"],
  "squad.size": ["clubId", "count", "min", "max"],
  "squad.min_goalkeepers": ["clubId", "count", "min"],
  "player.potential_below_strength": ["potential", "strength"],
  "player.duplicate_trait": ["trait"],
  "player.age_out_of_range": ["age", "min", "max"],
  "rivalry.same_club": ["clubId"],
  "rivalry.duplicate_pair": ["clubA", "clubB", "otherIndex"],
  "package.not_zip": [],
  "package.too_large": ["size", "max"],
  "package.images_too_large": ["size", "max"],
  "file.too_large": ["file", "size", "max"],
  "image.missing": ["clubId", "file"],
  "image.unused": ["file"],
  "image.too_large": ["file", "size", "max"],
  "image.too_big_dimensions": ["file", "width", "height", "max"],
  "image.bad_format": ["file"],
  "csv.missing_column": ["file", "column"],
  "csv.unknown_column": ["file", "column"],
  "csv.row_length": ["file", "line", "found", "expected"],
  "csv.invalid_number": ["file", "line", "column", "value"],
  "csv.unclosed_quote": ["file", "line"],
  "file.missing": ["file"],
  "file.invalid_json": ["file", "line", "column"],
} as const satisfies Record<string, readonly string[]>;

export type IssueCode = keyof typeof ISSUE_PARAMS;

export const ISSUE_CODES = Object.keys(ISSUE_PARAMS) as IssueCode[];

const WARNING_CODES: ReadonlySet<IssueCode> = new Set<IssueCode>([
  "schema.unknown_field",
  "image.unused",
  "csv.unknown_column",
]);

export function severityOf(code: IssueCode): Severity {
  return WARNING_CODES.has(code) ? "warning" : "error";
}

export type IssueParams = Record<string, string | number>;

export interface ValidationIssue {
  severity: Severity;
  code: IssueCode;
  section: Section;
  /** Caminho dentro da seção, ex.: `[132, "strength"]`. */
  path: (string | number)[];
  entityId?: string;
  params: IssueParams;
}

export function makeIssue(
  code: IssueCode,
  section: Section,
  path: (string | number)[],
  params: IssueParams,
  entityId?: string,
): ValidationIssue {
  const issue: ValidationIssue = { severity: severityOf(code), code, section, path, params };
  if (entityId !== undefined) {
    issue.entityId = entityId;
  }
  return issue;
}
