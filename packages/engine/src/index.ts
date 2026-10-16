// API pública do motor (contracts/engine-api.md). Nada fora deste arquivo é API pública.

export { ageOn } from "./calendar/date.js";
export { deriveMarketValue, deriveWage } from "./derived/economy.js";
export { adequacy } from "./match/adequacy.js";
export type { AutoLineupOptions, AutoLineupResult } from "./match/auto-lineup.js";
export { autoLineup } from "./match/auto-lineup.js";
export type { ChangeResult } from "./match/changes.js";
export { applyChange } from "./match/changes.js";
export type { Advance, SimulateResult, StartResult } from "./match/engine.js";
export { advanceMatch, simulateMatch, startMatch } from "./match/engine.js";
export type { MatchError, MatchErrorCode } from "./match/errors.js";
export { MATCH_ERROR_CODES, MATCH_ERROR_PARAMS } from "./match/errors.js";
export type { Formation, FormationId, Posture, Slot } from "./match/formations.js";
export { FORMATION_IDS, FORMATIONS, POSTURES } from "./match/formations.js";
export { MATCH_REALISM_LIMITS } from "./match/limits.js";
export type { MatchMetrics, MetricCheck } from "./match/metrics.js";
export { checkRealism, createMetricsAccumulator } from "./match/metrics.js";
export { matchResult } from "./match/result.js";
export type { TeamStrength } from "./match/strength.js";
export { teamStrength } from "./match/strength.js";
export { MATCH_TUNING } from "./match/tuning.js";
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
} from "./match/types.js";
export {
  CREST_SHAPES,
  POSITIONS,
  RESERVED_FORMAT_TYPES,
  SUPPORTED_FORMAT_VERSIONS,
  TIEBREAKERS,
  TRAITS,
} from "./model/catalogs.js";
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
} from "./model/types.js";
export type { Rng, RngState, WeightedItem } from "./rng/xoshiro.js";
export { createRng, restoreRng } from "./rng/xoshiro.js";
export { fixtureSeed, generateCalendar } from "./season/calendar.js";
export type { CredibilityCheck } from "./season/credibility.js";
export {
  aggregateCredibility,
  clubStrength,
  seasonReport,
  spearman,
} from "./season/credibility.js";
export { applyMatchToStatus, INJURY_MATCHES, injuryDuration } from "./season/discipline.js";
export type { SeasonError, SeasonErrorCode } from "./season/errors.js";
export { SEASON_ERROR_CODES, SEASON_ERROR_PARAMS } from "./season/errors.js";
export { SEASON_CREDIBILITY_LIMITS } from "./season/limits.js";
export { preferredFormation } from "./season/lineups.js";
export type { AdvanceSeasonResult, CreateSeasonResult } from "./season/season.js";
export { advanceSeason, createSeason, isSeasonOver, unavailablePlayers } from "./season/season.js";
export { standings } from "./season/standings.js";
export { seasonStats, topAssists, topScorers } from "./season/stats.js";
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
} from "./season/types.js";
export { DEFAULT_DISCIPLINE_RULES } from "./season/types.js";
export { BANK_FILES, joinBankFiles, splitBankFiles } from "./serialize/bank-files.js";
export { toCanonicalJson } from "./serialize/canonical-json.js";
export type {
  IssueCode,
  IssueParams,
  Section,
  Severity,
  ValidationIssue,
} from "./validation/issues.js";
export { ISSUE_CODES, ISSUE_PARAMS, makeIssue, SECTIONS, severityOf } from "./validation/issues.js";
export type { ValidationResult } from "./validation/validate.js";
export { validateBank } from "./validation/validate.js";
export type { GenerateOptions } from "./worldgen/generate.js";
export { generateDefaultBank } from "./worldgen/generate.js";
export { completeHiddenAttributes } from "./worldgen/hidden.js";
export { DISTRIBUTION_LIMITS, REPUTATION_TIERS, tierOf } from "./worldgen/limits.js";
