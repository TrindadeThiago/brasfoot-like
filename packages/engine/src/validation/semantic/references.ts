import type { SemanticContext } from "../context.js";
import { makeIssue, type Section, type ValidationIssue } from "../issues.js";

/** Um id existe na seção se algum item da entrada o declarou, mesmo que inválido (sem cascata). */
function existsIn(context: SemanticContext, id: string, section: Section): boolean {
  return context.ids.get(id)?.some((location) => location.section === section) ?? false;
}

/** Referências a países e clubes (FR-021). */
export function checkReferences(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const country = (
    section: Section,
    index: number,
    field: string,
    countryId: string,
    entityId: string,
  ) => {
    if (!existsIn(context, countryId, "countries")) {
      issues.push(
        makeIssue("ref.country_not_found", section, [index, field], { field, countryId }, entityId),
      );
    }
  };

  for (const { index, value } of context.competitions) {
    country("competitions", index, "countryId", value.countryId, value.id);
    value.divisions.forEach((division, divisionIndex) => {
      division.clubIds.forEach((clubId, clubIndex) => {
        if (!existsIn(context, clubId, "clubs")) {
          issues.push(
            makeIssue(
              "ref.club_not_found",
              "competitions",
              [index, "divisions", divisionIndex, "clubIds", clubIndex],
              { clubId },
              value.id,
            ),
          );
        }
      });
    });
  }
  for (const { index, value } of context.clubs) {
    country("clubs", index, "countryId", value.countryId, value.id);
  }
  for (const { index, value } of context.players) {
    country("players", index, "nationalityId", value.nationalityId, value.id);
    if (!existsIn(context, value.clubId, "clubs")) {
      issues.push(
        makeIssue(
          "ref.club_not_found",
          "players",
          [index, "clubId"],
          { clubId: value.clubId },
          value.id,
        ),
      );
    }
  }
  return issues;
}
