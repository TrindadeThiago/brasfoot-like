import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";

/** Rivalidades (013 FR-009): clubes existentes, diferentes e pares sem repetição. */
export function checkRivalries(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const pairs = new Map<string, number>();
  for (const { index, value } of context.rivalries) {
    const [a, b] = value.clubIds;
    const entityId = `${a}/${b}`;
    value.clubIds.forEach((clubId, side) => {
      const exists = context.ids.get(clubId)?.some((location) => location.section === "clubs");
      if (!exists) {
        issues.push(
          makeIssue(
            "ref.club_not_found",
            "rivalries",
            [index, "clubIds", side],
            { clubId },
            entityId,
          ),
        );
      }
    });
    if (a === b) {
      issues.push(
        makeIssue("rivalry.same_club", "rivalries", [index, "clubIds"], { clubId: a }, entityId),
      );
      continue;
    }
    const key = a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`;
    const other = pairs.get(key);
    if (other !== undefined) {
      issues.push(
        makeIssue(
          "rivalry.duplicate_pair",
          "rivalries",
          [index, "clubIds"],
          { clubA: a, clubB: b, otherIndex: other },
          entityId,
        ),
      );
    } else {
      pairs.set(key, index);
    }
  }
  return issues;
}
