import type { SemanticContext } from "../context";
import { makeIssue, SECTIONS, type ValidationIssue } from "../issues";

/** Ids únicos no banco inteiro, siglas de clube e códigos de país únicos (FR-020). */
export function checkUniqueness(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [id, locations] of context.ids) {
    if (locations.length < 2) continue;
    const ordered = [...locations].sort(
      (a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) || a.index - b.index,
    );
    const [first, ...duplicates] = ordered;
    if (first === undefined) continue;
    for (const location of duplicates) {
      issues.push(
        makeIssue(
          "unique.duplicate_id",
          location.section,
          [location.index, "id"],
          { id, otherSection: first.section, otherIndex: first.index },
          id,
        ),
      );
    }
  }

  const abbreviations = new Map<string, string>();
  for (const { index, value } of context.clubs) {
    const other = abbreviations.get(value.abbreviation);
    if (other === undefined) {
      abbreviations.set(value.abbreviation, value.id);
    } else {
      issues.push(
        makeIssue(
          "unique.duplicate_abbreviation",
          "clubs",
          [index, "abbreviation"],
          { abbreviation: value.abbreviation, otherClubId: other },
          value.id,
        ),
      );
    }
  }

  const codes = new Map<string, string>();
  for (const { index, value } of context.countries) {
    const other = codes.get(value.code);
    if (other === undefined) {
      codes.set(value.code, value.id);
    } else {
      issues.push(
        makeIssue(
          "unique.duplicate_country_code",
          "countries",
          [index, "code"],
          { code: value.code, otherCountryId: other },
          value.id,
        ),
      );
    }
  }

  return issues;
}
