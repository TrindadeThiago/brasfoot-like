import { stageParticipantCounts, stageQualifierCount, stagesOf } from "../../stages/rules";
import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";

/**
 * Estaduais (023): `regional` exige país e exatamente duas divisões em fases (grupos e mata-mata,
 * final em ida e volta); os clubes são do país e da região do estadual; um país que declara
 * estaduais exige região em todos os clubes. Contagens de grupos e fases e as vagas de acesso e
 * rebaixamento usam as regras gerais (`stages.*` e `division.*`).
 */
export function checkRegional(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const regionalCountries = new Set<string>();
  const regions = new Map<string, string>();
  const clubById = new Map(context.clubs.map((item) => [item.value.id, item.value]));

  for (const { index, value: competition } of context.competitions) {
    const regional = competition.regional;
    if (!regional) continue;
    const report = (
      code: Parameters<typeof makeIssue>[0],
      path: (string | number)[],
      params = {},
    ) =>
      issues.push(
        makeIssue(
          code,
          "competitions",
          path,
          { competitionId: competition.id, ...params } as never,
          competition.id,
        ),
      );
    if (competition.countryId === undefined) {
      report("regional.needs_country", [index, "regional"]);
    } else {
      regionalCountries.add(competition.countryId);
      const key = `${competition.countryId}|${regional.region}`;
      const other = regions.get(key);
      if (other !== undefined) {
        report("regional.duplicate_region", [index, "regional", "region"], {
          region: regional.region,
          otherCompetitionId: other,
        });
      } else {
        regions.set(key, competition.id);
      }
    }
    if (competition.divisions.length !== 2) {
      report("regional.divisions_count", [index, "divisions"], {
        count: competition.divisions.length,
      });
    }

    const weights = regional.weight?.byReputation ?? [];
    weights.forEach((entry, position) => {
      const previous = weights[position - 1];
      if (previous && entry.from <= previous.from) {
        report("regional.weight_order", [index, "regional", "weight", "byReputation", position], {
          index: position,
        });
      }
    });

    competition.divisions.forEach((division, position) => {
      const path = [index, "divisions", position];
      const stages = stagesOf(competition, division);
      const first = stages[0];
      const last = stages.at(-1);
      const shape = (reason: string, at: (string | number)[] = path) =>
        report("regional.stages_missing", at, { level: division.level, reason });
      if (first?.type !== "groups" || last?.type !== "knockout" || stages.length < 2) {
        shape("shape");
      } else if (last.phases.at(-1)?.legs !== 2) {
        shape("final_legs", [...path, "stages"]);
      }

      division.clubIds.forEach((clubId, clubIndex) => {
        const club = clubById.get(clubId);
        if (!club) return;
        const clubPath = [...path, "clubIds", clubIndex];
        if (competition.countryId !== undefined && club.countryId !== competition.countryId) {
          report("regional.club_country", clubPath, { clubId });
        } else if (club.region !== regional.region) {
          report("regional.club_region", clubPath, { clubId, region: regional.region });
        }
      });

      // Sobem no máximo os clubes que chegam ao mata-mata (por padrão, os finalistas).
      if (division.promotionSlots > 0 && last?.type === "knockout" && stages.length >= 2) {
        const counts = stageParticipantCounts(stages, division.clubIds.length);
        const knockoutClubs = counts[stages.length - 1] ?? 0;
        const finalists = stageQualifierCount(last, knockoutClubs);
        if (division.promotionSlots > Math.max(knockoutClubs, finalists)) {
          report("regional.promotion_exceeds_knockout", [...path, "promotionSlots"], {
            promotion: division.promotionSlots,
            clubs: knockoutClubs,
          });
        }
      }
    });
  }

  if (regionalCountries.size > 0) {
    for (const { index, value: club } of context.clubs) {
      if (regionalCountries.has(club.countryId) && club.region === undefined) {
        issues.push(
          makeIssue(
            "regional.club_without_region",
            "clubs",
            [index, "region"],
            { clubId: club.id, countryId: club.countryId },
            club.id,
          ),
        );
      }
    }
  }
  return issues;
}
