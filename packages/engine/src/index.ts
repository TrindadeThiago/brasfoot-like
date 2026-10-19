// API pública do motor (contracts/engine-api.md). Nada fora deste arquivo é API pública.

export { ageOn, seasonDate } from "./calendar/date";
export type { CompositionChange } from "./career/composition";
export { nextComposition } from "./career/composition";
export {
  clubDivision,
  createLeagueSeason,
  divisionSeason,
  divisionZones,
  isLeagueSeasonOver,
  leagueRound,
  leagueSeasonSeed,
  leagueTotalRounds,
} from "./career/league";
export { advanceLeague, completeLeagueRound, startLeagueRound } from "./career/league-round";
export {
  DEFAULT_TURNOVER_STEPS,
  resolveTurnoverSteps,
  seasonTurnover,
  TURNOVER_STEP_IDS,
} from "./career/turnover";
export type {
  DivisionZones,
  HistoryDivision,
  HistoryRow,
  LeagueResult,
  LeagueSeason,
  LeagueSeasonOptions,
  NextSeasonDraft,
  SeasonHistoryEntry,
  TurnoverContext,
  TurnoverOptions,
  TurnoverRegistration,
  TurnoverResult,
  TurnoverStep,
} from "./career/types";
export { deriveMarketValue, deriveWage } from "./derived/economy";
export type { FinanceResult } from "./finance/actions";
export {
  creditLine,
  interestFor,
  repayLoan,
  setTicketPrice,
  startStadiumWorks,
  takeLoan,
} from "./finance/actions";
export {
  annualWageBill,
  createFinances,
  defaultTicketPrice,
  sponsorshipFor,
} from "./finance/create";
export type { FinanceError, FinanceErrorCode } from "./finance/errors";
export { FINANCE_ERROR_CODES, FINANCE_ERROR_PARAMS, financeError } from "./finance/errors";
export type { GateEstimate } from "./finance/gate";
export { gateFor, nextHomeGateEstimate, powQuarters } from "./finance/gate";
export type { CareerRenewal, CareerRoundResult } from "./finance/round";
export { advanceCareer, applyRoundFinances, completeCareerRound } from "./finance/round";
export { DEFAULT_ECONOMY, divisionEconomy, economyRules } from "./finance/rules";
export { seasonFinanceSummary } from "./finance/summary";
export { prizeFor } from "./finance/turnover";
export type {
  ClubFinance,
  CrisisRecord,
  DivisionEconomy,
  EconomyRules,
  FinanceSeasonSummary,
  FinanceState,
  GateRecord,
  LedgerCategory,
  LedgerEntry,
  StadiumOption,
  StadiumWorks,
} from "./finance/types";
export { LEDGER_CATEGORIES } from "./finance/types";
export * from "./lineup";
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
export { FORMATION_IDS, FORMATIONS, POSTURES, slotPosition } from "./match/formations";
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
export {
  evolutionDelta,
  evolvePlayers,
  midSeasonRound,
  minutesInRounds,
} from "./renewal/evolution";
export { initialRenewal, measureWorld, playerSeq } from "./renewal/measure";
export type { CountryNames } from "./renewal/names";
export { DEFAULT_NAME_BANK, nameBankFor } from "./renewal/names";
export { regulate } from "./renewal/regulator";
export { retirementChance, retirePlayers } from "./renewal/retirement";
export {
  EVOLUTION_RULES,
  PROSPECT_POTENTIAL,
  REGULATOR_RULES,
  RETIREMENT_RULES,
  SQUAD_RULES,
  STAR_THRESHOLD,
  YOUTH_RULES,
} from "./renewal/rules";
export { balanceSquads, squadProblems } from "./renewal/squads";
export type {
  EvolutionRecord,
  PlayerDelta,
  PlayerRef,
  RegulatorState,
  RenewalState,
  SquadChangeNotice,
  WorldMeasure,
} from "./renewal/types";
export { generateYouth, youthCount } from "./renewal/youth";
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
export { lineupForMatch, preferredFormation, SEASON_BENCH_LIMIT } from "./season/lineups";
export type { LiveMatch, LiveRound, RoundDecision } from "./season/live-round";
export {
  advanceRound,
  applyRoundChange,
  completeRound,
  finishRound,
  formationChange,
  isRoundFinished,
  matchOf,
  matchTicks,
  startRound,
} from "./season/live-round";
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
