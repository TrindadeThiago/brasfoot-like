// API pública do motor (contracts/engine-api.md). Nada fora deste arquivo é API pública.

export { coachOf, coachReputation } from "./board/coaches";
export { confidenceChange, patiencePct } from "./board/confidence";
export type { CreateBoardManager } from "./board/create";
export { createBoard, managerClubOf } from "./board/create";
export { evaluateSeason, inGrace, shouldFireMidSeason } from "./board/evaluation";
export {
  currentPosition,
  expectationOf,
  financeMet,
  goalProgress,
  goalTiersFor,
  playedRounds,
  seasonGoals,
} from "./board/goals";
export type { AcceptResult } from "./board/offers";
export {
  acceptJobOffer,
  compatibleClub,
  declineJobOffer,
  pendingOffers,
} from "./board/offers";
export type { ReputationInput } from "./board/reputation";
export { reputationDelta } from "./board/reputation";
export { boardAfterExtraMatches, boardAfterRound } from "./board/round";
export type { BoardRules } from "./board/rules";
export { boardRules, DEFAULT_BOARD } from "./board/rules";
export { boardNewSeasonStep } from "./board/turnover";
export type {
  Achievement,
  BoardContext,
  BoardDecision,
  BoardError,
  BoardErrorCode,
  BoardNotice,
  BoardState,
  BoardUpdate,
  ClubBoard,
  Coach,
  ConfidenceChange,
  ConfidenceFactor,
  FinanceGoalKind,
  GoalProgress,
  GoalTierId,
  JobOffer,
  JobOfferStatus,
  ManagerHistory,
  ManagerProfile,
  ManagerSeasonRecord,
  RoundRef,
  SeasonEvaluation,
  SeasonGoals,
  Stint,
  StintExit,
  Vacancy,
} from "./board/types";
export { CONFIDENCE_FACTORS, FINANCE_GOAL_KINDS, GOAL_TIERS } from "./board/types";
export { addDays, ageOn, diffDays, seasonDate, weekdayOf } from "./calendar/date";
export type { CompetitionSchedule } from "./calendar/schedule";
export { DEFAULT_SCHEDULE, roundDates, scheduleOf } from "./calendar/schedule";
export type {
  CalendarCompetition,
  CalendarDay,
  CalendarIssue,
  CalendarSlot,
  SeasonCalendar,
} from "./calendar/season-calendar";
export {
  buildSeasonCalendar,
  calendarCompetitions,
  dateOfRound,
  dayIndexAfter,
  SEASON_DAYS,
  theoreticalRounds,
} from "./calendar/season-calendar";
export type { CompositionChange } from "./career/composition";
export { nextComposition } from "./career/composition";
export type { CareerDayResult } from "./career/day";
export {
  advanceCareer,
  advanceCareerDays,
  advanceCareerToNextMatch,
  completeCareerDay,
  completeCareerRound,
  startCareerDay,
} from "./career/day";
export { competitionEntry } from "./career/history";
export { availabilitySeason, clubsInRound, syncInjuries } from "./career/injuries";
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
export type {
  CareerSeasonOptions,
  CareerSeasonResult,
  CareerSeasonSet,
  CareerSeasonState,
  ClubFixture,
  DayMatch,
} from "./career/season-state";
export {
  calendarNext,
  clubFixtures,
  competitionSeason,
  createCareerSeason,
  currentDay,
  isCalendarOver,
  leagueCalendar,
  nextClubFixture,
  otherSuspensions,
  roundMatches,
  upcomingUnavailability,
} from "./career/season-state";
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
export { createFans } from "./fans/create";
export { idolEvents, idolsOf } from "./fans/idols";
export {
  derbyMultiplierPct,
  fansAfterExtraMatches,
  fansAfterRound,
  gateMoodFactor,
  moodBand,
  moodChange,
  roundResult,
} from "./fans/mood";
export { isDerby, rivalriesOf, rivalryOf, rivalsOf } from "./fans/rivalries";
export type { FansRules } from "./fans/rules";
export { DEFAULT_FANS, fansRules } from "./fans/rules";
export { fansNewSeasonStep } from "./fans/turnover";
export type {
  ClubFans,
  FansContext,
  FansState,
  MoodBand,
  MoodChange,
  MoodFactor,
} from "./fans/types";
export { MOOD_BANDS, MOOD_FACTORS } from "./fans/types";
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
export type {
  CareerBoard,
  CareerFans,
  CareerMarket,
  CareerNews,
  CareerRenewal,
  CareerRoundResult,
} from "./finance/round";
export { applyExtraGates, applyRoundFinances, applyRoundSystems } from "./finance/round";
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
export {
  fitnessAfterMatches,
  fitnessFactorBp,
  fitnessOn,
  squadWithFitness,
  worldWithFitness,
} from "./fitness/fitness";
export { DEFAULT_FITNESS, fitnessRules } from "./fitness/rules";
export type { FitnessEntry, FitnessRules, FitnessState } from "./fitness/types";
export {
  createCupSeason,
  drawReady,
  ensurePhaseDrawn,
  phaseParticipants,
} from "./knockout/bracket";
export type { DrawClub, DrawnPair, DrawRules } from "./knockout/draw";
export { drawPhase } from "./knockout/draw";
export type { CupHistoryEntry } from "./knockout/history";
export { cupEntry, cupSeasonOf } from "./knockout/history";
export {
  DEFAULT_KNOCKOUT,
  knockoutFormat,
  phaseOfRound,
  phaseRounds,
  totalLegs,
} from "./knockout/rules";
export {
  cupChampion,
  cupReached,
  deciderFor,
  phaseDecided,
  phaseWinners,
  tieState,
} from "./knockout/tie";
export type { Bracket, BracketPhase, Tie, TieDecidedBy, TieState } from "./knockout/types";
export * from "./lineup";
export type { ClubNeeds, PositionNeed } from "./market/ai/needs";
export { clubNeeds, STARTERS_BY_POSITION } from "./market/ai/needs";
export { incomingOfferFor } from "./market/ai/offers";
export {
  closedWindow,
  closeWindowReport,
  reportForDivision,
  reportHighlights,
} from "./market/ai/report";
export { aiClubs, aiContractYears, aiMarketRound } from "./market/ai/round";
export type { AiMarketRules } from "./market/ai/rules";
export { aiMarketRules, DEFAULT_AI_MARKET } from "./market/ai/rules";
export { askingPrice, loanAskingPrice, maxBidFor, respondToOffer } from "./market/club-response";
export {
  contractYearsRange,
  ensureContracts,
  initialContract,
  isLastYear,
} from "./market/contracts";
export {
  completeLoan,
  completeRenewal,
  completeSigning,
  completeTransfer,
} from "./market/effects";
export type { MarketErrorCode } from "./market/errors";
export { MARKET_ERROR_CODES, MARKET_ERROR_PARAMS } from "./market/errors";
export { addFreeAgents, toFreeAgent } from "./market/free-agents";
export type { IncomingAnswer } from "./market/incoming";
export { answerIncomingOffer, marketAfterRound } from "./market/incoming";
export type { NegotiationStep, StartInput } from "./market/negotiation";
export {
  answerClubCounter,
  answerPlayerDemand,
  cancelNegotiation,
  proposeContract,
  startNegotiation,
} from "./market/negotiation";
export { attraction, exigency, respondToContract, wageDemand } from "./market/player-response";
export { releaseManagerClub } from "./market/release";
export { DEFAULT_MARKET, marketRules } from "./market/rules";
export { comparePlayers, searchPlayers } from "./market/search";
export { canAddPlayer, canRemovePlayer, squadSize, strengthRank } from "./market/squad";
export type {
  ClubResponse,
  Contract,
  FreeAgent,
  FreePlayer,
  IncomingOffer,
  MarketContext,
  MarketError,
  MarketResult,
  MarketRow,
  MarketRules,
  MarketState,
  MarketUpdate,
  MarketWindow,
  Negotiation,
  NegotiationKind,
  NegotiationOutcome,
  NegotiationStage,
  PlayerFilters,
  PlayerResponse,
  ReportEntry,
  TransferKind,
  TransferRecord,
  WindowReport,
} from "./market/types";
export { emptyMarket, marketError } from "./market/types";
export { contractValuePct, marketValue } from "./market/value";
export {
  currentWindowEnd,
  isWindowOpen,
  nextWindowRound,
  roundsPlayed,
  transferWindows,
  type WindowDates,
  windowDates,
} from "./market/windows";
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
export { liveStats, matchResult } from "./match/result";
export { penaltyChance, shootoutOrder, shootoutProgress } from "./match/shootout";
export type { TeamStrength } from "./match/strength";
export { teamStrength } from "./match/strength";
export { MATCH_TUNING } from "./match/tuning";
export type {
  Decider,
  InjurySeverity,
  Lineup,
  MatchChange,
  MatchClock,
  MatchDecision,
  MatchEvent,
  MatchHalf,
  MatchInput,
  MatchResult,
  MatchState,
  MatchStatus,
  PendingChange,
  PlayerMatchState,
  PositionMove,
  ShootoutKick,
  ShootoutOutcome,
  ShootoutState,
  ShotKind,
  ShotOutcome,
  Side,
  TeamInput,
  TeamState,
  TeamStats,
} from "./match/types";
export {
  CREST_SHAPES,
  KNOCKOUT_HOME_RULES,
  KNOCKOUT_TIEBREAKERS,
  POSITIONS,
  RESERVED_FORMAT_TYPES,
  SUPPORTED_FORMAT_VERSIONS,
  TIEBREAKERS,
  TRAITS,
} from "./model/catalogs";
export { OPTIONAL_SECTIONS } from "./model/schemas";
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
  KnockoutEntry,
  KnockoutFormat,
  KnockoutPhase,
  LeagueFormat,
  Manifest,
  ModPackage,
  Player,
  Position,
  Rivalry,
  Tiebreaker,
  Trait,
  ValidatedBank,
} from "./model/types";
export { clinched } from "./news/clinched";
export { createNews } from "./news/create";
export type { Fact } from "./news/facts";
export { isComeback, matchFacts, streakOf } from "./news/facts";
export { headlinesOf, latestFeed, rankFeed } from "./news/feed";
export {
  accumulate,
  allTimeScorers,
  clubLegends,
  pruneAllTime,
  titlesByClub,
} from "./news/history";
export type { RecordCandidate } from "./news/records";
export { beats, updateRecords } from "./news/records";
export { newsAfterExtraMatches, newsAfterRound, toHeadlines } from "./news/round";
export type { NewsRules } from "./news/rules";
export { DEFAULT_NEWS, newsRules } from "./news/rules";
export { newsNewSeasonStep } from "./news/turnover";
export type {
  AllTime,
  ClubRecordKind,
  Headline,
  HeadlineType,
  HeadlineVars,
  LeagueRecordKind,
  Legend,
  NewsContext,
  NewsState,
  PlayerTotals,
  RecordEntry,
  Records,
  RoundFeed,
  SeasonNews,
} from "./news/types";
export { CLUB_RECORD_KINDS, HEADLINE_TYPES, LEAGUE_RECORD_KINDS } from "./news/types";
export { variantOf } from "./news/variants";
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
export type { DataSection } from "./serialize/bank-files";
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
export { withNationalCup } from "./worldgen/add-cup";
export { DEFAULT_BANK_SEED } from "./worldgen/default-seed";
export type { GenerateOptions } from "./worldgen/generate";
export { generateDefaultBank } from "./worldgen/generate";
export { completeHiddenAttributes } from "./worldgen/hidden";
export { DISTRIBUTION_LIMITS, REPUTATION_TIERS, tierOf } from "./worldgen/limits";
export { generateRivalries } from "./worldgen/rivalries";
