import type { Club, Competition, Division, KnockoutStage, StageFormat } from "../../model/types";
import { groupLetter } from "../../stages/groups-draw";
import { isStaged, knockoutCounts, stageQualifierCount, stagesOf } from "../../stages/rules";
import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";

/**
 * Divisões disputadas em fases (019 R10): grupos que fecham com o número de clubes, classificados
 * compatíveis com a fase seguinte, entradas, potes e regras de sorteio. Tudo sai dos dados; um banco
 * sem `stages`/`groups` nunca passa por aqui.
 */

type Path = (string | number)[];
type Report = (
  code: Parameters<typeof makeIssue>[0],
  path: Path,
  params: Parameters<typeof makeIssue>[3],
) => void;

/** Fase do banco cujos números não fecham: a primeira fase do mata-mata que falha, ou nada. */
function knockoutProblem(
  stage: KnockoutStage,
  participants: number,
  isLast: boolean,
): { phase: number; count: number; delta: number } | undefined {
  const { phases } = knockoutCounts(stage, participants);
  for (let position = 0; position < phases.length; position++) {
    const count = phases[position] as number;
    const finalOfSequence = isLast && position === phases.length - 1;
    const wanted = finalOfSequence ? 2 : count + (Number.isInteger(count) ? count % 2 : 1);
    if (count === wanted && count >= 2) continue;
    return { phase: position + 1, count, delta: wanted - count };
  }
  return undefined;
}

/** Maior número de clubes conhecidos que dividem o mesmo valor do atributo, e esse valor. */
function biggestShare(
  clubs: readonly Club[],
  attribute: "country" | "region",
): { value: string; count: number } | undefined {
  const counts = new Map<string, number>();
  for (const club of clubs) {
    const value = attribute === "country" ? club.countryId : club.region;
    if (value === undefined) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let best: { value: string; count: number } | undefined;
  for (const [value, count] of [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!best || count > best.count) best = { value, count };
  }
  return best;
}

/** Origens que a fase de pontos anterior produz (`A1`, `T2`, `X1`…), na ordem canônica. */
function originsOf(
  previous: StageFormat | undefined,
  count: number | undefined,
): string[] | undefined {
  if (!previous || count === undefined) return undefined;
  if (previous.type === "league") {
    return Array.from({ length: previous.qualified ?? 0 }, (_, index) => `T${index + 1}`);
  }
  if (previous.type !== "groups" || previous.qualified === undefined) return undefined;
  const groups = count / previous.groupSize;
  if (!Number.isInteger(groups)) return undefined;
  const direct = Array.from({ length: groups }, (_, group) =>
    Array.from(
      { length: previous.qualified as number },
      (_, position) => `${groupLetter(group)}${position + 1}`,
    ),
  ).flat();
  const extras = Array.from({ length: previous.extra ?? 0 }, (_, index) => `X${index + 1}`);
  return [...direct, ...extras];
}

/** Tabela própria de confrontos: cada classificado aparece uma vez e só existem origens reais. */
function checkPairs(
  stage: KnockoutStage,
  origins: readonly string[] | undefined,
  path: Path,
  number: number,
  report: Report,
): void {
  if (!stage.pairs) return;
  const valid = new Set(origins ?? []);
  const seen = new Set<string>();
  let reported = false;
  stage.pairs.forEach((pair, i) => {
    pair.forEach((origin, j) => {
      if (!valid.has(origin) || seen.has(origin)) {
        reported = true;
        report("stages.pairs_invalid", [...path, "pairs", i, j], { stage: number, origin });
      }
      seen.add(origin);
    });
  });
  const missing = (origins ?? []).find((origin) => !seen.has(origin));
  if (!reported && missing !== undefined) {
    report("stages.pairs_invalid", [...path, "pairs"], { stage: number, origin: missing });
  }
}

function checkPointsStage(stage: StageFormat, path: Path, report: Report): void {
  if (stage.type === "knockout") return;
  const { points, tiebreakers } = stage;
  if (!(points.win > points.draw && points.draw >= points.loss)) {
    report("format.points_order", [...path, "points"], {
      win: points.win,
      draw: points.draw,
      loss: points.loss,
    });
  }
  const seen = new Set<string>();
  tiebreakers.forEach((tiebreaker, position) => {
    if (seen.has(tiebreaker)) {
      report("format.duplicate_tiebreaker", [...path, "tiebreakers", position], { tiebreaker });
    }
    seen.add(tiebreaker);
  });
}

function checkDivision(
  index: number,
  competition: Competition,
  position: number,
  division: Division,
  clubsById: ReadonlyMap<string, Club>,
  issues: ValidationIssue[],
): void {
  const stages = stagesOf(competition, division);
  const stagePath = (k: number): Path => {
    if (division.stages) return [index, "divisions", position, "stages", k];
    if (competition.format.type === "stages") return [index, "format", "stages", k];
    return [index, "format"];
  };
  const report: Report = (code, path, params) =>
    issues.push(makeIssue(code, "competitions", path, params, competition.id));
  const last = stages.length - 1;
  const inDivision = new Set(division.clubIds);

  // Entradas: só valem depois da primeira fase, para clubes da divisão, sem repetir.
  const entered = new Set<string>();
  stages.forEach((stage, k) => {
    (stage.enter ?? []).forEach((clubId, i) => {
      const path = [...stagePath(k), "enter", i];
      if (k === 0) report("stages.enter_first_stage", path, { stage: k + 1, clubId });
      else if (!inDivision.has(clubId)) {
        report("stages.enter_unknown_club", path, { stage: k + 1, clubId });
      } else if (entered.has(clubId)) {
        report("stages.enter_duplicate", path, { stage: k + 1, clubId });
      }
      entered.add(clubId);
    });
  });

  let participants =
    division.clubIds.length - [...entered].filter((id) => inDivision.has(id)).length;
  const opening = participants;
  let previousQualifying: number | undefined;
  let previousParticipants: number | undefined;
  for (let k = 0; k <= last; k++) {
    const stage = stages[k] as StageFormat;
    const path = stagePath(k);
    const number = k + 1;
    const derived = previousQualifying !== undefined;
    const isLast = k === last;
    checkPointsStage(stage, path, report);

    let fits = true;
    // Descreve um número de clubes que não fecha a fase: culpa da fase anterior, se houver.
    const mismatch = (own: () => void) => {
      fits = false;
      if (derived) {
        report("stages.qualify_mismatch", [...stagePath(k - 1), "qualified"], {
          stage: k,
          qualifying: previousQualifying as number,
          next: number,
          nextClubs: participants,
        });
      } else own();
    };

    if (stage.type === "groups") {
      const groups = participants / stage.groupSize;
      if (!Number.isInteger(groups)) {
        mismatch(() =>
          report("stages.group_size_mismatch", [...path, "groupSize"], {
            stage: number,
            clubs: participants,
            groupSize: stage.groupSize,
          }),
        );
      } else {
        if (groups < 2) {
          mismatch(() =>
            report("stages.group_count", [...path, "groupSize"], { stage: number, groups }),
          );
        }
        if (stage.extra !== undefined && stage.extra > groups) {
          report("stages.extra_exceeds_groups", [...path, "extra"], {
            stage: number,
            extra: stage.extra,
            groups,
          });
        }
      }
      checkDraw(stage, k, participants, entered, clubsById, division, stagePath, report, number);
      checkQualified(stage.qualified, stage.groupSize - 1, isLast, path, number, report);
    } else if (stage.type === "league") {
      if (participants < 2) fits = false;
      checkQualified(stage.qualified, participants - 1, isLast, path, number, report);
    } else {
      stage.phases.forEach((phase, p) => {
        const phasePath = [...path, "phases", p];
        if (phase.tiebreakers.at(-1) !== "penalties") {
          report("knockout.no_decider", [...phasePath, "tiebreakers"], { phase: p + 1 });
        }
        if (phase.neutral && phase.legs === 2) {
          report("knockout.neutral_two_legs", [...phasePath, "neutral"], { phase: p + 1 });
        }
      });
      const seenEntries = new Set<string>();
      (stage.entries ?? []).forEach((entry, e) => {
        if (
          !Number.isInteger(entry.phase) ||
          entry.phase < 1 ||
          entry.phase >= stage.phases.length
        ) {
          report("knockout.entry_phase", [...path, "entries", e, "phase"], {
            phase: entry.phase,
            phases: stage.phases.length,
          });
        }
        entry.clubIds.forEach((clubId, c) => {
          if (seenEntries.has(clubId)) {
            report("knockout.entry_duplicate", [...path, "entries", e, "clubIds", c], { clubId });
          }
          seenEntries.add(clubId);
        });
      });
      checkPairs(stage, originsOf(stages[k - 1], previousParticipants), path, number, report);
      const problem = knockoutProblem(stage, participants, isLast);
      if (problem) {
        mismatch(() =>
          report("stages.knockout_count", [...path, "phases", problem.phase - 1], {
            stage: number,
            phase: problem.phase,
            count: problem.count,
            delta: problem.delta,
          }),
        );
      }
    }

    if (k === 0 && !isLast && stage.type !== "knockout" && stage.qualified !== undefined) {
      // O rebaixamento sai de quem não passa da primeira fase (019 FR-022).
      const eliminated = opening - stageQualifierCount(stage, opening);
      if (division.relegationSlots > eliminated) {
        report(
          "stages.relegation_exceeds_eliminated",
          [index, "divisions", position, "relegationSlots"],
          { level: division.level, relegation: division.relegationSlots, eliminated },
        );
      }
    }

    if (isLast) {
      if (
        stage.type !== "knockout" &&
        (stage.qualified !== undefined || (stage.type === "groups" && (stage.extra ?? 0) > 0))
      ) {
        report("stages.qualified_without_next", [...path, "qualified"], { stage: number });
      }
      break;
    }
    // Sem classificados declarados, ou com uma fase que não fecha, o resto não tem como ser conferido.
    if (!fits) break;
    const qualifying = stageQualifierCount(stage, participants);
    if (stage.type !== "knockout" && stage.qualified === undefined) break;
    previousQualifying = qualifying;
    previousParticipants = participants;
    participants = qualifying + (stages[k + 1]?.enter?.length ?? 0);
  }
}

function checkQualified(
  qualified: number | undefined,
  max: number,
  isLast: boolean,
  path: Path,
  stage: number,
  report: Report,
): void {
  if (qualified === undefined) {
    if (!isLast)
      report("stages.qualify_range", [...path, "qualified"], { stage, qualified: 0, max });
    return;
  }
  if (isLast) return;
  if (qualified < 1 || qualified > max) {
    report("stages.qualify_range", [...path, "qualified"], { stage, qualified, max });
  }
}

function checkDraw(
  stage: Extract<StageFormat, { type: "groups" }>,
  k: number,
  participants: number,
  entered: ReadonlySet<string>,
  clubsById: ReadonlyMap<string, Club>,
  division: Division,
  stagePath: (k: number) => Path,
  report: Report,
  number: number,
): void {
  const draw = stage.draw;
  if (!draw) return;
  const path = [...stagePath(k), "draw"];
  const groups = participants / stage.groupSize;
  const enterHere = stage.enter?.length ?? 0;
  if (
    (draw.pots !== undefined && draw.pots !== stage.groupSize) ||
    (draw.previousStagePot && draw.pots === undefined)
  ) {
    report("stages.pots_range", [...path, "pots"], {
      stage: number,
      pots: draw.pots ?? 0,
      groupSize: stage.groupSize,
    });
  } else if (draw.previousStagePot && Number.isInteger(groups)) {
    // Na primeira fase ninguém vem de uma fase anterior.
    const fromPrevious = k === 0 ? 0 : participants - enterHere;
    if (fromPrevious !== groups) {
      report("stages.pot_size", [...path, "previousStagePot"], {
        stage: number,
        pot: draw.pots ?? 0,
        clubs: fromPrevious,
        groups,
      });
    }
  }
  (draw.rules ?? []).forEach((rule, r) => {
    if (rule.kind !== "separate") return;
    const rulePath = [...path, "rules", r];
    (rule.exemptPots ?? []).forEach((pot, e) => {
      if (pot > (draw.pots ?? 0)) {
        report("stages.rule_exempt_pot", [...rulePath, "exemptPots", e], {
          stage: number,
          pot,
          pots: draw.pots ?? 0,
        });
      }
    });
    if (!Number.isInteger(groups)) return;
    // Só se prova pelos dados com os clubes que se conhece e que nunca caem num pote isento.
    const exempt = rule.exemptPots ?? [];
    const onlyOriginPotExempt =
      draw.previousStagePot === true && exempt.every((pot) => pot === draw.pots);
    if (exempt.length > 0 && !onlyOriginPotExempt) return;
    const known: Club[] =
      k === 0
        ? division.clubIds
            .filter((id) => !entered.has(id))
            .flatMap((id) => (clubsById.get(id) ? [clubsById.get(id) as Club] : []))
        : (stage.enter ?? []).flatMap((id) =>
            clubsById.get(id) ? [clubsById.get(id) as Club] : [],
          );
    const share = biggestShare(known, rule.attribute);
    if (share && share.count > groups) {
      report("stages.separation_impossible", rulePath, {
        stage: number,
        attribute: rule.attribute,
        value: share.value,
        clubs: share.count,
        groups,
      });
    }
  });
}

/** Regras das divisões disputadas em fases (019 R10). */
export function checkStages(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const clubsById = new Map(context.clubs.map((item) => [item.value.id, item.value]));
  for (const { index, value: competition } of context.competitions) {
    competition.divisions.forEach((division, position) => {
      if (isStaged(competition, division)) {
        checkDivision(index, competition, position, division, clubsById, issues);
      }
    });
  }
  return issues;
}
