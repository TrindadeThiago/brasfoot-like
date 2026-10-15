import type { ModPackage, ValidatedBank } from "../model/types.js";
import type { SemanticRule } from "./context.js";
import { SECTIONS, type ValidationIssue } from "./issues.js";
import { checkCompetitions } from "./semantic/competitions.js";
import { checkReferences } from "./semantic/references.js";
import { checkSquads } from "./semantic/squads.js";
import { checkUniqueness } from "./semantic/uniqueness.js";
import { validateStructure } from "./structural.js";

export type ValidationResult =
  | { ok: true; bank: ValidatedBank; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

/** Regras semânticas, na ordem em que rodam (fase 2). */
const SEMANTIC_RULES: SemanticRule[] = [
  checkUniqueness,
  checkReferences,
  checkCompetitions,
  checkSquads,
];

function firstIndex(issue: ValidationIssue): number {
  const first = issue.path[0];
  return typeof first === "number" ? first : -1;
}

function compareIssues(a: ValidationIssue, b: ValidationIssue): number {
  return (
    SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) ||
    firstIndex(a) - firstIndex(b) ||
    a.code.localeCompare(b.code) ||
    JSON.stringify(a.path).localeCompare(JSON.stringify(b.path))
  );
}

/**
 * Valida um banco vindo de fora (FR-018 a FR-026). Nunca lança exceção para entrada inválida;
 * retorna todos os erros e avisos em ordem determinística.
 */
export function validateBank(input: unknown): ValidationResult {
  const { context, issues, aborted } = validateStructure(input);
  if (!aborted) {
    for (const rule of SEMANTIC_RULES) {
      issues.push(...rule(context));
    }
  }

  issues.sort(compareIssues);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  if (errors.length > 0 || context.manifest === undefined) {
    return { ok: false, errors, warnings };
  }

  const bank: ModPackage = {
    manifest: context.manifest,
    countries: context.countries.map((item) => item.value),
    competitions: context.competitions.map((item) => item.value),
    clubs: context.clubs.map((item) => item.value),
    players: context.players.map((item) => item.value),
  };
  return { ok: true, bank: bank as ValidatedBank, warnings };
}
