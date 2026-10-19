import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";

/** Mínimo de nomes e sobrenomes de um banco de nomes de país (009). */
export const MIN_COUNTRY_NAMES = 20;

/** Bancos de nomes dos países com variedade suficiente para gerar jogadores. */
export function checkCountries(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const { index, value } of context.countries) {
    if (!value.names) continue;
    for (const kind of ["firstNames", "surnames"] as const) {
      const count = value.names[kind].length;
      if (count < MIN_COUNTRY_NAMES) {
        issues.push(
          makeIssue(
            "country.names_too_few",
            "countries",
            [index, "names", kind],
            { kind, count, min: MIN_COUNTRY_NAMES },
            value.id,
          ),
        );
      }
    }
  }
  return issues;
}
