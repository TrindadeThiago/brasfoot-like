import { parseIsoDate } from "../../calendar/date";
import { buildSeasonCalendar, calendarCompetitions } from "../../calendar/season-calendar";
import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";
import { mainCompetitions } from "./countries";

/**
 * Calendário e competições (017 R2, R3): clube de competição secundária fora da principal e datas
 * impossíveis (clube com dois jogos no mesmo dia, competição que não cabe na temporada).
 */
export function checkCalendar(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // A principal é a primeira competição de cada país (020 R1); as demais têm de ter clubes dela.
  const mains = mainCompetitions(context);
  for (const { index, value: competition } of context.competitions) {
    // Competição entre países (022): os clubes vêm de várias ligas; a forma é de continental.ts.
    if (competition.countryId === undefined) continue;
    const main = mains.get(competition.countryId);
    if (!main || main.index === index) continue;
    const inMain = new Set(main.value.divisions.flatMap((division) => division.clubIds));
    competition.divisions.forEach((division, position) => {
      division.clubIds.forEach((clubId, clubIndex) => {
        if (inMain.has(clubId)) return;
        issues.push(
          makeIssue(
            "competition.club_outside_main",
            "competitions",
            [index, "divisions", position, "clubIds", clubIndex],
            { clubId, competitionId: competition.id },
            competition.id,
          ),
        );
      });
    });
  }

  const start = context.manifest?.referenceDate;
  if (start === undefined || parseIsoDate(start) === null) return issues;
  const built = buildSeasonCalendar(
    calendarCompetitions(context.competitions.map((item) => item.value)),
    start,
  );
  if (built.ok) return issues;
  const indexOf = (competitionId: string) =>
    context.competitions.find((item) => item.value.id === competitionId)?.index ?? 0;
  for (const issue of built.issues) {
    const { code, ...params } = issue;
    issues.push(
      makeIssue(
        code,
        "competitions",
        [indexOf(issue.competitionId), "schedule"],
        params,
        issue.competitionId,
      ),
    );
  }
  return issues;
}
