// API pública do motor (contracts/engine-api.md). Nada fora deste arquivo é API pública.

export { ageOn } from "./calendar/date.js";
export { deriveMarketValue, deriveWage } from "./derived/economy.js";
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
