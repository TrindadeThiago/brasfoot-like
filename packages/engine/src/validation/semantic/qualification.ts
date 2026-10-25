import type { Berth, BerthSource, Competition, Division } from "../../model/types";
import { findCycle } from "../../qualification/order";
import { berthSize } from "../../qualification/pools";
import type { SemanticContext } from "../context";
import { type IssueCode, type IssueParams, makeIssue, type ValidationIssue } from "../issues";

/**
 * Vagas entre competições (021): referências, faixas, contagem por divisão e por fase, fechamento do
 * repasse e ciclos. Tudo sai dos dados; nenhum caso por competição.
 */
export function checkQualification(context: SemanticContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const competitions = context.competitions.map((item) => item.value);
  const world = { competitions };
  const byId = new Map(competitions.map((competition) => [competition.id, competition]));

  const cycle = findCycle(competitions);
  const cycleOwner = cycle
    ? context.competitions.find((item) => item.value.id === cycle[0])
    : undefined;
  if (cycle && cycleOwner) {
    issues.push(
      makeIssue(
        "qualification.cycle",
        "competitions",
        [cycleOwner.index],
        { path: cycle.join(" → ") },
        cycleOwner.value.id,
      ),
    );
  }

  for (const { index, value: competition } of context.competitions) {
    competition.divisions.forEach((division, position) => {
      const berths = division.berths ?? [];
      if (berths.length === 0) return;
      const at = (...path: (string | number)[]) => [index, "divisions", position, ...path];
      const report = (code: IssueCode, path: (string | number)[], params: IssueParams) =>
        issues.push(makeIssue(code, "competitions", path, params, competition.id));

      const seen = new Set<string>();
      berths.forEach((berth, k) => {
        if (seen.has(berth.id)) {
          report("qualification.duplicate_berth_id", at("berths", k, "id"), { berthId: berth.id });
        }
        seen.add(berth.id);
        checkBerth(berth, at("berths", k), report, byId, division.clubIds.length);
      });

      const total = berths.reduce((sum, berth) => sum + berthSize(world, berth.source), 0);
      checkCounts(competition, division, total, at, report);
      checkEntries(competition, berths, world, at, report);
    });
  }
  return issues;
}

type Report = (code: IssueCode, path: (string | number)[], params: IssueParams) => void;

function sizeOfDivision(byId: Map<string, Competition>, competitionId: string, level: number) {
  return byId.get(competitionId)?.divisions.find((entry) => entry.level === level)?.clubIds.length;
}

function checkSource(
  berth: Berth,
  source: BerthSource,
  path: (string | number)[],
  report: Report,
  byId: Map<string, Competition>,
): void {
  const target = byId.get(source.competitionId);
  if (!target) {
    report("qualification.unknown_competition", [...path, "competitionId"], {
      berthId: berth.id,
      competitionId: source.competitionId,
    });
    return;
  }
  if (source.kind === "position") {
    const size = sizeOfDivision(byId, source.competitionId, source.level);
    if (size === undefined) {
      report("qualification.unknown_level", [...path, "level"], {
        berthId: berth.id,
        competitionId: source.competitionId,
        level: source.level,
      });
    } else if (source.to < source.from || source.to > size) {
      report("qualification.range_invalid", [...path, "to"], {
        berthId: berth.id,
        from: source.from,
        to: source.to,
        size,
      });
    }
  }
  if (source.kind === "reached") {
    if (target.format.type !== "knockout") {
      report("qualification.reached_not_cup", [...path, "competitionId"], {
        berthId: berth.id,
        competitionId: source.competitionId,
      });
    } else if (source.phase > target.format.phases.length) {
      report("qualification.unknown_phase", [...path, "phase"], {
        berthId: berth.id,
        competitionId: source.competitionId,
        phase: source.phase,
      });
    }
  }
}

function checkBerth(
  berth: Berth,
  path: (string | number)[],
  report: Report,
  byId: Map<string, Competition>,
  needed: number,
): void {
  checkSource(berth, berth.source, [...path, "source"], report, byId);
  (berth.fallback ?? []).forEach((source, k) => {
    checkSource(berth, source, [...path, "fallback", k], report, byId);
  });
  for (const key of ["require", "forbid"] as const) {
    (berth[key] ?? []).forEach((ref, k) => {
      const refPath = [...path, key, k];
      if (!byId.has(ref.competitionId)) {
        report("qualification.unknown_competition", [...refPath, "competitionId"], {
          berthId: berth.id,
          competitionId: ref.competitionId,
        });
      } else if (sizeOfDivision(byId, ref.competitionId, ref.level) === undefined) {
        report("qualification.unknown_level", [...refPath, "level"], {
          berthId: berth.id,
          competitionId: ref.competitionId,
          level: ref.level,
        });
      }
    });
  }
  // O último passo do repasse é o fechamento: a tabela inteira de uma divisão de referência.
  const closing = berth.fallback?.at(-1);
  if (closing?.kind !== "position") {
    report("qualification.no_closing", [...path, "fallback"], { berthId: berth.id });
    return;
  }
  const size = sizeOfDivision(byId, closing.competitionId, closing.level);
  const closingPath = [...path, "fallback", (berth.fallback?.length ?? 1) - 1];
  if (size !== undefined && (closing.from !== 1 || closing.to !== size)) {
    report("qualification.no_closing", closingPath, { berthId: berth.id });
  } else if (size !== undefined && size < needed) {
    report("qualification.pool_too_small", closingPath, { berthId: berth.id, clubs: size, needed });
  }
}

/**
 * As vagas somam os participantes da divisão (competição alimentada) ou as saídas da pirâmide
 * (acesso da primeira divisão e rebaixamento da última para fora, R5).
 */
function checkCounts(
  competition: Competition,
  division: Division,
  total: number,
  at: (...path: (string | number)[]) => (string | number)[],
  report: Report,
): void {
  const size = division.clubIds.length;
  const levels = competition.divisions.map((entry) => entry.level);
  const exits =
    (division.level === Math.min(...levels) ? division.promotionSlots : 0) +
    (division.level === Math.max(...levels) ? division.relegationSlots : 0);
  if (exits === 0) {
    if (total !== size || competition.divisions.length !== 1) {
      report("qualification.count_mismatch", at("berths"), { total, size });
    }
    return;
  }
  if (total !== exits) {
    report("qualification.pyramid_exit_mismatch", at("berths"), {
      total,
      relegation: exits,
      size,
    });
  }
}

/** Entradas tardias: as vagas por fase fecham com as entradas declaradas no formato (R6). */
function checkEntries(
  competition: Competition,
  berths: readonly Berth[],
  world: { competitions: Competition[] },
  at: (...path: (string | number)[]) => (string | number)[],
  report: Report,
): void {
  const { format } = competition;
  if (format.type !== "knockout") return;
  const entering = new Map<number, number>();
  berths.forEach((berth, k) => {
    const phase = berth.entry?.phase ?? 1;
    if (phase > format.phases.length) {
      report("qualification.unknown_phase", at("berths", k, "entry", "phase"), {
        berthId: berth.id,
        competitionId: competition.id,
        phase,
      });
      return;
    }
    entering.set(phase, (entering.get(phase) ?? 0) + berthSize(world, berth.source));
  });
  // `entries[].phase` do formato conta a partir de 0; a vaga conta a partir de 1.
  const declared = new Map(
    (format.entries ?? []).map((entry) => [entry.phase + 1, entry.clubIds.length]),
  );
  for (let phase = 2; phase <= format.phases.length; phase++) {
    const berthCount = entering.get(phase) ?? 0;
    const entriesCount = declared.get(phase) ?? 0;
    if (berthCount !== entriesCount) {
      report("qualification.entry_count_mismatch", at("berths"), {
        phase,
        berths: berthCount,
        entering: entriesCount,
      });
    }
  }
}
