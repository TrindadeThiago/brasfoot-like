import type { KnockoutFormat } from "../../model/types";
import type { SemanticContext } from "../context";
import { makeIssue, type ValidationIssue } from "../issues";

/**
 * Copas (018 R3): uma divisão só, entradas coerentes, fases com número par de clubes até a final,
 * critério final que sempre decida e campo neutro só em jogo único. Tudo sai dos dados.
 */
export function checkKnockout(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const { index, value: competition } of context.competitions) {
    const format = competition.format;
    if (format.type !== "knockout") continue;
    const id = competition.id;
    const issue = (
      code: Parameters<typeof makeIssue>[0],
      path: (string | number)[],
      params: Parameters<typeof makeIssue>[3],
    ) => issues.push(makeIssue(code, "competitions", [index, ...path], params, id));

    if (competition.divisions.length > 1) {
      issue("knockout.single_division", ["divisions"], { divisions: competition.divisions.length });
    }
    const participants = new Set(competition.divisions[0]?.clubIds ?? []);

    format.phases.forEach((phase, position) => {
      const path = ["format", "phases", position];
      if (phase.tiebreakers.at(-1) !== "penalties") {
        issue("knockout.no_decider", [...path, "tiebreakers"], { phase: position + 1 });
      }
      if (phase.neutral && phase.legs === 2) {
        issue("knockout.neutral_two_legs", [...path, "neutral"], { phase: position + 1 });
      }
    });

    const entering = checkEntries(format, participants, issue);
    if (competition.divisions.length > 1) continue;
    checkCounts(format, participants.size, entering, issue);
  }
  return issues;
}

type Report = (
  code: Parameters<typeof makeIssue>[0],
  path: (string | number)[],
  params: Parameters<typeof makeIssue>[3],
) => void;

/** Valida as entradas e devolve, por fase, quantos clubes entram de fato (só as válidas). */
function checkEntries(
  format: KnockoutFormat,
  participants: ReadonlySet<string>,
  report: Report,
): number[] {
  const entering = format.phases.map(() => 0);
  const seen = new Set<string>();
  (format.entries ?? []).forEach((entry, position) => {
    const valid =
      Number.isInteger(entry.phase) && entry.phase >= 1 && entry.phase < format.phases.length;
    if (!valid) {
      report("knockout.entry_phase", ["format", "entries", position, "phase"], {
        phase: entry.phase,
        phases: format.phases.length,
      });
    }
    entry.clubIds.forEach((clubId, clubPosition) => {
      const path = ["format", "entries", position, "clubIds", clubPosition];
      if (seen.has(clubId)) {
        report("knockout.entry_duplicate", path, { clubId });
        return;
      }
      seen.add(clubId);
      if (!participants.has(clubId)) {
        report("knockout.entry_not_participant", path, { clubId });
        return;
      }
      if (valid) entering[entry.phase] = (entering[entry.phase] ?? 0) + 1;
    });
  });
  return entering;
}

/** Clubes por fase: n0 = participantes − entradas; n(p) = n(p−1)/2 + entradas(p); par, e 2 na final. */
function checkCounts(
  format: KnockoutFormat,
  participants: number,
  entering: readonly number[],
  report: Report,
): void {
  let count = participants - entering.reduce((sum, value) => sum + value, 0);
  for (let position = 0; position < format.phases.length; position++) {
    if (position > 0) count = count / 2 + (entering[position] ?? 0);
    const last = position === format.phases.length - 1;
    const wanted = last ? 2 : count + (count % 2);
    if (count === wanted && count >= 2) continue;
    const path = position === 0 ? ["divisions", 0, "clubIds"] : ["format", "phases", position];
    report("knockout.phase_count", path, {
      phase: position + 1,
      count,
      delta: wanted - count,
    });
    return;
  }
}
