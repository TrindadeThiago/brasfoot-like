import { parseIsoDate } from "../../calendar/date";
import {
  buildSeasonCalendar,
  calendarCompetitions,
  dateOfRound,
} from "../../calendar/season-calendar";
import { phaseRounds } from "../../knockout/rules";
import type { Competition, DropIn } from "../../model/types";
import { dropInSize } from "../../stages/incoming";
import { stageRoundRanges, stagesOf } from "../../stages/rules";
import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";
import { mainCompetitions } from "./countries";

/** Regras econômicas que só valem na competição principal do país (020 R1). */
const COUNTRY_RULES = ["economy", "market", "board", "fans", "news", "fitness"] as const;

/**
 * Competições entre países (022 R1): sem `countryId`, uma divisão, formato de copa, grupos ou
 * fases, nunca a primeira do banco; os clubes vêm das ligas principais de ao menos dois países.
 */
export function checkContinental(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const inMain = new Set<string>();
  for (const { value } of mainCompetitions(context).values()) {
    for (const division of value.divisions) {
      for (const id of division.clubIds) inMain.add(id);
    }
  }
  const countryOf = new Map(context.clubs.map((item) => [item.value.id, item.value.countryId]));

  for (const { index, value: competition } of context.competitions) {
    if (competition.countryId !== undefined) continue;
    const shape = (reason: string, path: (string | number)[]) =>
      issues.push(
        makeIssue(
          "continental.shape",
          "competitions",
          path,
          { competitionId: competition.id, reason },
          competition.id,
        ),
      );
    if (index === 0) shape("first", [index]);
    if (competition.divisions.length !== 1) shape("divisions", [index, "divisions"]);
    if (competition.format.type === "league") shape("format", [index, "format", "type"]);

    const countries = new Set<string>();
    competition.divisions.forEach((division, position) => {
      division.clubIds.forEach((clubId, clubIndex) => {
        const country = countryOf.get(clubId);
        if (!inMain.has(clubId)) {
          // Clube inexistente já é erro de referência; aqui só o que existe e está sem liga.
          if (country !== undefined) {
            issues.push(
              makeIssue(
                "continental.club_without_league",
                "competitions",
                [index, "divisions", position, "clubIds", clubIndex],
                { clubId, competitionId: competition.id },
                competition.id,
              ),
            );
          }
          return;
        }
        if (country !== undefined) countries.add(country);
      });
    });
    if (competition.divisions.length > 0 && countries.size < 2) {
      issues.push(
        makeIssue(
          "continental.single_country",
          "competitions",
          [index, "divisions"],
          { competitionId: competition.id, countries: countries.size },
          competition.id,
        ),
      );
    }

    for (const field of COUNTRY_RULES) {
      if (competition[field] === undefined) continue;
      issues.push(
        makeIssue(
          "continental.rules_ignored",
          "competitions",
          [index, field],
          { competitionId: competition.id, field },
          competition.id,
        ),
      );
    }
  }
  return issues;
}

/** Rodadas (absolutas, na competição) de cada fase de uma divisão em fases. */
function stageRounds(competition: Competition): number[][] {
  const division = competition.divisions[0];
  return division ? stageRoundRanges(stagesOf(competition, division), division.clubIds.length) : [];
}

interface DropInEnv {
  competition: Competition;
  division: Competition["divisions"][number];
  competitions: Competition[];
  byId: Map<string, Competition>;
  calendar: Parameters<typeof dateOfRound>[0] | undefined;
}

/** Problemas de uma ligação: `at` completa o caminho dentro dela. */
function dropInProblems(
  env: DropInEnv,
  dropIn: DropIn,
  at: (...path: (string | number)[]) => (string | number)[],
): ValidationIssue[] {
  const { competition, division, competitions, byId, calendar } = env;
  const issues: ValidationIssue[] = [];
  const report = (
    code: Parameters<typeof makeIssue>[0],
    path: (string | number)[],
    params: Parameters<typeof makeIssue>[3],
  ) => issues.push(makeIssue(code, "competitions", path, params, competition.id));
  const known = { dropInId: dropIn.id };
  const unknown = (field: string, path: (string | number)[]) =>
    report("continental.dropin_unknown", path, { ...known, field });

  if (dropIn.source.competitionId === competition.id) {
    report("continental.dropin_self", at("source", "competitionId"), {
      ...known,
      competitionId: competition.id,
    });
    return issues;
  }
  const origin = byId.get(dropIn.source.competitionId);
  if (!origin) {
    unknown("competitionId", at("source", "competitionId"));
    return issues;
  }
  const originDivision = origin.divisions[0];
  const sourceStage = originDivision
    ? stagesOf(origin, originDivision)[dropIn.source.stage - 1]
    : undefined;
  if (!sourceStage) {
    unknown("stage", at("source", "stage"));
    return issues;
  }
  if (dropIn.source.kind === "position" && sourceStage.type === "knockout") {
    unknown("kind", at("source", "kind"));
    return issues;
  }
  if (dropIn.source.kind === "eliminated") {
    if (sourceStage.type !== "knockout") {
      unknown("kind", at("source", "kind"));
      return issues;
    }
    if (dropIn.source.phase > sourceStage.phases.length) {
      unknown("phase", at("source", "phase"));
      return issues;
    }
  }
  const targetStage = stagesOf(competition, division)[dropIn.entry.stage - 1];
  if (!targetStage || targetStage.type === "league") {
    unknown("stage", at("entry", "stage"));
    return issues;
  }
  if (dropIn.entry.stage === 1) {
    report("continental.dropin_first_stage", at("entry", "stage"), known);
  }
  if (
    dropIn.entry.phase !== undefined &&
    (targetStage.type !== "knockout" || dropIn.entry.phase > targetStage.phases.length)
  ) {
    unknown("phase", at("entry", "phase"));
    return issues;
  }
  if (dropIn.source.kind === "position" && sourceStage.type !== "knockout") {
    const qualified = sourceStage.qualified ?? 0;
    if (dropIn.source.from <= qualified) {
      report("continental.dropin_qualified", at("source", "from"), { ...known, qualified });
    }
  }
  if (dropInSize({ competitions }, dropIn) === undefined) {
    report("continental.dropin_count", at("source"), known);
  }
  if (calendar) {
    const sourceDate = lastDate(calendar, origin, dropIn);
    const targetDate = firstDate(calendar, competition, dropIn);
    if (sourceDate !== undefined && targetDate !== undefined && targetDate <= sourceDate) {
      report("continental.dropin_before_source", at("entry"), { ...known, date: sourceDate });
    }
  }
  return issues;
}

/** Ligações entre competições (022 R3): referências, contagem, fase de entrada, datas. */
export function checkDropIns(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const competitions = context.competitions.map((item) => item.value);
  const byId = new Map(competitions.map((competition) => [competition.id, competition]));
  const start = context.manifest?.referenceDate;
  const built =
    start !== undefined && parseIsoDate(start) !== null
      ? buildSeasonCalendar(calendarCompetitions(competitions), start)
      : undefined;
  const calendar = built?.ok ? built.calendar : undefined;
  for (const { index, value: competition } of context.competitions) {
    for (const [position, division] of competition.divisions.entries()) {
      for (const [k, dropIn] of (division.dropIns ?? []).entries()) {
        const at = (...path: (string | number)[]) => [
          index,
          "divisions",
          position,
          "dropIns",
          k,
          ...path,
        ];
        issues.push(
          ...dropInProblems({ competition, division, competitions, byId, calendar }, dropIn, at),
        );
      }
    }
  }
  return issues;
}

/** Data da última rodada da fase (ou da fase eliminatória) de origem da ligação. */
function lastDate(
  calendar: Parameters<typeof dateOfRound>[0],
  origin: Competition,
  dropIn: DropIn,
): string | undefined {
  const division = origin.divisions[0];
  const stage = division ? stagesOf(origin, division)[dropIn.source.stage - 1] : undefined;
  const rounds = stageRounds(origin)[dropIn.source.stage - 1] ?? [];
  if (dropIn.source.kind === "eliminated" && stage?.type === "knockout") {
    const phase = phaseRounds(stage, rounds[0] ?? 1)[dropIn.source.phase - 1];
    return dateOfRound(calendar, origin.id, phase?.at(-1) ?? 0);
  }
  return dateOfRound(calendar, origin.id, rounds.at(-1) ?? 0);
}

/** Data da primeira rodada da fase (ou fase eliminatória) de destino da ligação. */
function firstDate(
  calendar: Parameters<typeof dateOfRound>[0],
  competition: Competition,
  dropIn: DropIn,
): string | undefined {
  const division = competition.divisions[0];
  const stage = division ? stagesOf(competition, division)[dropIn.entry.stage - 1] : undefined;
  const rounds = stageRounds(competition)[dropIn.entry.stage - 1] ?? [];
  if (dropIn.entry.phase !== undefined && stage?.type === "knockout") {
    const phase = phaseRounds(stage, rounds[0] ?? 1)[dropIn.entry.phase - 1];
    return dateOfRound(calendar, competition.id, phase?.[0] ?? 0);
  }
  return dateOfRound(calendar, competition.id, rounds[0] ?? 0);
}

/**
 * Prêmios e reputação (022 R4, R5): as fases citadas existem na competição e a tabela de
 * reputação cresce com a fase alcançada.
 */
export function checkAwards(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const { index, value: competition } of context.competitions) {
    const awards = competition.awards;
    const division = competition.divisions[0];
    if (!awards || !division) continue;
    const stages = stagesOf(competition, division);
    /** `phase` de um prêmio por fase vai até o número de fases; o campeão vale uma a mais. */
    const knows = (stage: number, phase: number | undefined, champion: boolean): boolean => {
      const format = stages[stage - 1];
      if (!format) return false;
      if (phase === undefined) return true;
      if (format.type !== "knockout") return false;
      return phase <= format.phases.length + (champion && stage === stages.length ? 1 : 0);
    };
    const report = (path: (string | number)[], stage: number) =>
      issues.push(
        makeIssue(
          "continental.awards_unknown_stage",
          "competitions",
          [index, "awards", ...path],
          { competitionId: competition.id, stage },
          competition.id,
        ),
      );
    for (const [k, entry] of (awards.stage ?? []).entries()) {
      if (!knows(entry.stage, entry.phase, false)) {
        report(
          ["stage", k, entry.phase === undefined || !stages[entry.stage - 1] ? "stage" : "phase"],
          entry.stage,
        );
      }
    }
    let previous: { stage: number; phase: number; points: number } | undefined;
    for (const [k, entry] of (awards.reputation ?? []).entries()) {
      const { stage, phase } = entry.reached;
      if (!knows(stage, phase, true)) {
        report(
          [
            "reputation",
            k,
            "reached",
            phase === undefined || !stages[stage - 1] ? "stage" : "phase",
          ],
          stage,
        );
        continue;
      }
      const current = { stage, phase: phase ?? 0, points: entry.points };
      const grows =
        !previous ||
        ((current.stage > previous.stage ||
          (current.stage === previous.stage && current.phase > previous.phase)) &&
          current.points >= previous.points);
      if (!grows) {
        issues.push(
          makeIssue(
            "continental.awards_not_increasing",
            "competitions",
            [index, "awards", "reputation", k],
            { competitionId: competition.id, index: k },
            competition.id,
          ),
        );
      }
      previous = current;
    }
  }
  return issues;
}
