import type { Competition } from "../../model/types";
import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";

const MIN_CLUBS = 4;
/** Final única (supercopa, 021): dois clubes bastam. */
const MIN_CLUBS_SINGLE_FINAL = 2;
const MAX_CLUBS = 40;

function checkFormat(index: number, competition: Competition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // Copas têm as próprias regras de formato (validation/semantic/knockout.ts).
  if (competition.format.type !== "league") return issues;
  const { points, tiebreakers } = competition.format;
  if (!(points.win > points.draw && points.draw >= points.loss)) {
    issues.push(
      makeIssue(
        "format.points_order",
        "competitions",
        [index, "format", "points"],
        { win: points.win, draw: points.draw, loss: points.loss },
        competition.id,
      ),
    );
  }
  const seen = new Set<string>();
  tiebreakers.forEach((tiebreaker, position) => {
    if (seen.has(tiebreaker)) {
      issues.push(
        makeIssue(
          "format.duplicate_tiebreaker",
          "competitions",
          [index, "format", "tiebreakers", position],
          { tiebreaker },
          competition.id,
        ),
      );
    }
    seen.add(tiebreaker);
  });
  return issues;
}

/** Acesso e rebaixamento entre níveis contíguos (FR-022). */
function checkSlots(index: number, competition: Competition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const divisions = competition.divisions.map((division, position) => ({ division, position }));
  const levels = divisions.map(({ division }) => division.level);
  const sorted = [...levels].sort((a, b) => a - b);
  if (!sorted.every((level, position) => level === position + 1)) {
    issues.push(
      makeIssue(
        "division.levels_not_contiguous",
        "competitions",
        [index, "divisions"],
        { levels: levels.join(", ") },
        competition.id,
      ),
    );
    return issues;
  }

  const byLevel = [...divisions].sort((a, b) => a.division.level - b.division.level);
  const top = byLevel[0];
  const bottom = byLevel[byLevel.length - 1];
  if (top && top.division.promotionSlots > 0 && !top.division.berths?.length) {
    issues.push(
      makeIssue(
        "division.top_has_promotion",
        "competitions",
        [index, "divisions", top.position, "promotionSlots"],
        { slots: top.division.promotionSlots },
        competition.id,
      ),
    );
  }
  // A saída para fora da pirâmide é válida quando a divisão recebe clubes por vagas (021 R5).
  if (bottom && bottom.division.relegationSlots > 0 && !bottom.division.berths?.length) {
    issues.push(
      makeIssue(
        "division.bottom_has_relegation",
        "competitions",
        [index, "divisions", bottom.position, "relegationSlots"],
        { slots: bottom.division.relegationSlots },
        competition.id,
      ),
    );
  }
  for (let level = 0; level + 1 < byLevel.length; level++) {
    const upper = byLevel[level];
    const lower = byLevel[level + 1];
    if (!upper || !lower) continue;
    if (upper.division.relegationSlots !== lower.division.promotionSlots) {
      issues.push(
        makeIssue(
          "division.slots_mismatch",
          "competitions",
          [index, "divisions", lower.position, "promotionSlots"],
          {
            level: upper.division.level,
            relegated: upper.division.relegationSlots,
            nextLevel: lower.division.level,
            promoted: lower.division.promotionSlots,
          },
          competition.id,
        ),
      );
    }
  }
  return issues;
}

/** Regras econômicas coerentes com a competição (008). */
function checkEconomy(index: number, competition: Competition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const economy = competition.economy;
  if (!economy) return issues;
  if (economy.priceRange && economy.priceRange.min > economy.priceRange.max) {
    issues.push(
      makeIssue(
        "economy.price_range",
        "competitions",
        [index, "economy", "priceRange"],
        { min: economy.priceRange.min, max: economy.priceRange.max },
        competition.id,
      ),
    );
  }
  const levels = new Set(competition.divisions.map((division) => division.level));
  (economy.divisions ?? []).forEach((division, position) => {
    if (!levels.has(division.level)) {
      issues.push(
        makeIssue(
          "economy.unknown_division",
          "competitions",
          [index, "economy", "divisions", position, "level"],
          { level: division.level },
          competition.id,
        ),
      );
    }
  });
  return issues;
}

/** Formato de disputa e divisões de cada competição (FR-006 a FR-008, FR-021, FR-022). */
export function checkCompetitions(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const { index, value: competition } of context.competitions) {
    // Um clube só pode estar em uma divisão de cada competição; entre competições pode repetir (017).
    const placement = new Map<string, { competitionId: string; level: number }>();
    issues.push(...checkFormat(index, competition));
    issues.push(...checkEconomy(index, competition));

    competition.divisions.forEach((division, position) => {
      const path = [index, "divisions", position];
      const count = division.clubIds.length;
      const singleFinal =
        competition.format.type === "knockout" && competition.format.phases.length === 1;
      const minClubs = singleFinal ? MIN_CLUBS_SINGLE_FINAL : MIN_CLUBS;
      if (count < minClubs || count > MAX_CLUBS) {
        issues.push(
          makeIssue(
            "division.club_count",
            "competitions",
            [...path, "clubIds"],
            { count, min: minClubs, max: MAX_CLUBS },
            competition.id,
          ),
        );
      }
      const slots = division.promotionSlots + division.relegationSlots;
      if (slots > count) {
        issues.push(
          makeIssue(
            "division.slots_exceed_clubs",
            "competitions",
            path,
            { level: division.level, slots, clubs: count },
            competition.id,
          ),
        );
      }

      const inDivision = new Set<string>();
      division.clubIds.forEach((clubId, clubIndex) => {
        const clubPath = [...path, "clubIds", clubIndex];
        if (inDivision.has(clubId)) {
          issues.push(
            makeIssue(
              "division.duplicate_club",
              "competitions",
              clubPath,
              { clubId },
              competition.id,
            ),
          );
          return;
        }
        inDivision.add(clubId);
        const other = placement.get(clubId);
        if (other) {
          issues.push(
            makeIssue(
              "division.club_in_multiple",
              "competitions",
              clubPath,
              { clubId, otherCompetitionId: other.competitionId, otherLevel: other.level },
              competition.id,
            ),
          );
        } else {
          placement.set(clubId, { competitionId: competition.id, level: division.level });
        }
      });
    });

    issues.push(...checkSlots(index, competition));
  }
  return issues;
}
