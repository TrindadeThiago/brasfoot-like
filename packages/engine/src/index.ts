// API pública do motor (contracts/engine-api.md). Nada fora deste arquivo é API pública.

export { ageOn } from "./calendar/date";
export { deriveMarketValue, deriveWage } from "./derived/economy";
export { adequacy } from "./match/adequacy";
export type { AutoLineupOptions, AutoLineupResult } from "./match/auto-lineup";
export { autoLineup } from "./match/auto-lineup";
export type { ChangeResult } from "./match/changes";
export { applyChange } from "./match/changes";
export type { Advance, SimulateResult, StartResult } from "./match/engine";
export { advanceMatch, simulateMatch, startMatch } from "./match/engine";
export type { MatchError, MatchErrorCode } from "./match/errors";
export { MATCH_ERROR_CODES, MATCH_ERROR_PARAMS } from "./match/errors";
export type { Formation, FormationId, Posture, Slot } from "./match/formations";
export { FORMATION_IDS, FORMATIONS, POSTURES } from "./match/formations";
export { MATCH_REALISM_LIMITS } from "./match/limits";
export type { MatchMetrics, MetricCheck } from "./match/metrics";
export { checkRealism, createMetricsAccumulator } from "./match/metrics";
export { matchResult } from "./match/result";
export type { TeamStrength } from "./match/strength";
export { teamStrength } from "./match/strength";
export { MATCH_TUNING } from "./match/tuning";
export type {
  InjurySeverity,
  Lineup,
  MatchChange,
  MatchClock,
  MatchEvent,
  MatchInput,
  MatchResult,
  MatchState,
  MatchStatus,
  PendingChange,
  PlayerMatchState,
  ShotKind,
  ShotOutcome,
  Side,
  TeamInput,
  TeamState,
  TeamStats,
} from "./match/types";
export {
  CREST_SHAPES,
  POSITIONS,
  RESERVED_FORMAT_TYPES,
  SUPPORTED_FORMAT_VERSIONS,
  TIEBREAKERS,
  TRAITS,
} from "./model/catalogs";
export type {
  Club,
  Competition,
  CompetitionFormat,
  CompletedBank,
  CompletedPlayer,
  CompleteHiddenAttributes,
  Country,
  Crest,
  CrestShape,
  Division,
  HiddenAttributes,
  Manifest,
  ModPackage,
  Player,
  Position,
  Tiebreaker,
  Trait,
  ValidatedBank,
} from "./model/types";
export type { Rng, RngState, WeightedItem } from "./rng/xoshiro";
export { createRng, restoreRng } from "./rng/xoshiro";
export { fixtureSeed, generateCalendar } from "./season/calendar";
export type { CredibilityCheck } from "./season/credibility";
export {
  aggregateCredibility,
  clubStrength,
  seasonReport,
  spearman,
} from "./season/credibility";
export { applyMatchToStatus, INJURY_MATCHES, injuryDuration } from "./season/discipline";
export type { SeasonError, SeasonErrorCode } from "./season/errors";
export { SEASON_ERROR_CODES, SEASON_ERROR_PARAMS } from "./season/errors";
export { SEASON_CREDIBILITY_LIMITS } from "./season/limits";
export { preferredFormation } from "./season/lineups";
export type { AdvanceSeasonResult, CreateSeasonResult } from "./season/season";
export { advanceSeason, createSeason, isSeasonOver, unavailablePlayers } from "./season/season";
export { standings } from "./season/standings";
export { seasonStats, topAssists, topScorers } from "./season/stats";
export type {
  Absence,
  DisciplineRules,
  Fixture,
  FormResult,
  MatchRecord,
  PlayerLine,
  PlayerSeasonStats,
  PlayerStatus,
  Round,
  Season,
  SeasonOptions,
  SeasonReport,
  SeasonStep,
  SeasonWarning,
  StandingRow,
} from "./season/types";
export { DEFAULT_DISCIPLINE_RULES } from "./season/types";
export { BANK_FILES, joinBankFiles, splitBankFiles } from "./serialize/bank-files";
export { toCanonicalJson } from "./serialize/canonical-json";
export type {
  IssueCode,
  IssueParams,
  Section,
  Severity,
  ValidationIssue,
} from "./validation/issues";
export { ISSUE_CODES, ISSUE_PARAMS, makeIssue, SECTIONS, severityOf } from "./validation/issues";
export type { ValidationResult } from "./validation/validate";
export { validateBank } from "./validation/validate";
export type { GenerateOptions } from "./worldgen/generate";
export { generateDefaultBank } from "./worldgen/generate";
export { completeHiddenAttributes } from "./worldgen/hidden";
export { DISTRIBUTION_LIMITS, REPUTATION_TIERS, tierOf } from "./worldgen/limits";
