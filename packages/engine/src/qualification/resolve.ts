import type { LeagueSeason } from "../career/types";
import type { Berth, Competition, CompletedBank, Division, DivisionRef } from "../model/types";
import { type SeasonError, seasonError } from "../season/errors";
import { QualificationExhaustedError, QualificationSourceError } from "./errors";
import { resolutionOrder } from "./order";
import { berthSize, type FinishedSeasons, finishedByCompetition, poolOf } from "./pools";
import type { Entry, Origin, PassReason, QualificationEntry, QualificationResult } from "./types";

/**
 * Resolução das vagas entre competições ao fim da temporada (021 R2, R3). Pura e sem PRNG: a ordem
 * é a das vagas no banco, depois a posição, depois o id. Duas passadas por divisão: primeiro as
 * vagas diretas (a fonte oferece clube elegível), depois o repasse pela ordem de `fallback`.
 */

export interface ResolveInput {
  world: CompletedBank;
  /** Temporadas encerradas: liga em foco, `competitions` (outros países, secundárias, copas). */
  finished: readonly LeagueSeason[];
  /** Composição de cada nível calculada pelas pirâmides (`nextComposition`). */
  compositions: Readonly<Record<string, Record<number, readonly string[]>>>;
  /** Número e ano da temporada encerrada. */
  number: number;
  year: number;
}

export type ResolveOutcome =
  | { ok: true; result: QualificationResult }
  | { ok: false; error: SeasonError };

interface Slot {
  berth: Berth;
  index: number;
}

interface Filled {
  clubId: string;
  origin: Origin;
  via: "direct" | "pass";
  passedFrom?: { clubId: string; reason: PassReason };
}

function previousLevel(finished: FinishedSeasons, competitionId: string, clubId: string) {
  return finished.get(competitionId)?.divisions.find((season) => season.clubIds.includes(clubId))
    ?.divisionLevel;
}

export function resolveQualification(input: ResolveInput): ResolveOutcome {
  try {
    return { ok: true, result: resolve(input) };
  } catch (error) {
    if (error instanceof QualificationExhaustedError) {
      return {
        ok: false,
        error: seasonError("qualification.exhausted", {
          competitionId: error.competitionId,
          berthId: error.berthId,
        }),
      };
    }
    if (error instanceof QualificationSourceError) {
      return {
        ok: false,
        error: seasonError("qualification.source_missing", { competitionId: error.competitionId }),
      };
    }
    throw error;
  }
}

function resolve(input: ResolveInput): QualificationResult {
  const { world, number, year } = input;
  const finished = finishedByCompetition(input.finished);
  const existing = new Set(world.clubs.map((club) => club.id));
  const resolved: Record<string, Record<number, string[]>> = {};
  const result: QualificationResult = {
    compositions: {},
    entrants: {},
    origins: {},
    record: { number, year, entries: [] },
  };

  /** Clubes de uma divisão na temporada seguinte: resolvida, pirâmide ou banco (copas fixas). */
  const nextClubs = (ref: DivisionRef): ReadonlySet<string> => {
    const clubs =
      resolved[ref.competitionId]?.[ref.level] ??
      input.compositions[ref.competitionId]?.[ref.level] ??
      world.competitions
        .find((competition) => competition.id === ref.competitionId)
        ?.divisions.find((division) => division.level === ref.level)?.clubIds ??
      [];
    return new Set(clubs);
  };

  for (const competition of resolutionOrder(world.competitions)) {
    const target: Record<number, string[]> = {};
    resolved[competition.id] = target;
    const levels = [...competition.divisions].sort((a, b) => a.level - b.level);
    for (const division of levels) {
      const level = division.level;
      if ((division.berths?.length ?? 0) === 0) {
        target[level] = [...(input.compositions[competition.id]?.[level] ?? [])];
        continue;
      }
      fillDivision(competition, division);
    }
    result.compositions[competition.id] = target;
  }
  return result;

  function fillDivision(competition: Competition, division: Division): void {
    const berths = division.berths ?? [];
    const size = division.clubIds.length;
    const total = berths.reduce((sum, berth) => sum + berthSize(world, berth.source), 0);
    const fullyFed = total === size;
    const base = fullyFed ? [] : [...(input.compositions[competition.id]?.[division.level] ?? [])];
    const taken = new Set(base);
    const origins: Record<string, Origin> = {};
    for (const clubId of base) {
      const before = previousLevel(finished, competition.id, clubId);
      const kind =
        before === undefined || before === division.level
          ? "stay"
          : before > division.level
            ? "promotion"
            : "relegation";
      origins[clubId] = { kind };
    }

    const rejection = (berth: Berth, clubId: string): PassReason | undefined => {
      if (taken.has(clubId)) return "duplicate";
      if (!existing.has(clubId)) return "ineligible";
      if (berth.require?.length && !berth.require.some((ref) => nextClubs(ref).has(clubId))) {
        return "require";
      }
      if (berth.forbid?.some((ref) => nextClubs(ref).has(clubId))) return "forbid";
      return undefined;
    };

    const pools = new Map<string, { clubId: string; position?: number }[][]>();
    for (const berth of berths) {
      pools.set(
        berth.id,
        [berth.source, ...(berth.fallback ?? [])].map((source) => poolOf(world, finished, source)),
      );
    }

    const filled = new Map<string, Filled[]>();
    const open: { slot: Slot; wanted?: string; reason: PassReason }[] = [];
    const put = (berth: Berth, clubId: string, entry: Filled) => {
      taken.add(clubId);
      origins[clubId] = entry.origin;
      filled.set(berth.id, [...(filled.get(berth.id) ?? []), entry]);
    };

    // 1ª passada: vagas diretas.
    for (const berth of berths) {
      const primary = pools.get(berth.id)?.[0] ?? [];
      const count = berthSize(world, berth.source);
      for (let index = 0; index < count; index++) {
        const candidate = primary[index];
        const reason = candidate ? rejection(berth, candidate.clubId) : "ineligible";
        if (candidate && !reason) {
          put(berth, candidate.clubId, {
            clubId: candidate.clubId,
            via: "direct",
            origin: {
              kind: "berth",
              berthId: berth.id,
              source: berth.source.kind,
              from: berth.source.competitionId,
              ...(candidate.position !== undefined ? { position: candidate.position } : {}),
            },
          });
        } else {
          open.push({
            slot: { berth, index },
            ...(candidate ? { wanted: candidate.clubId } : {}),
            reason: reason ?? "ineligible",
          });
        }
      }
    }

    // 2ª passada: repasse pela ordem de `fallback`; o último item é o fechamento.
    for (const { slot, wanted, reason } of open) {
      const chain = (pools.get(slot.berth.id) ?? []).slice(1);
      let found: { clubId: string } | undefined;
      for (const pool of chain) {
        found = pool.find((entry) => !rejection(slot.berth, entry.clubId));
        if (found) break;
      }
      if (!found) throw new QualificationExhaustedError(competition.id, slot.berth.id);
      put(slot.berth, found.clubId, {
        clubId: found.clubId,
        via: "pass",
        passedFrom: { clubId: wanted ?? "", reason },
        origin: { kind: "pass", berthId: slot.berth.id, fromClubId: wanted ?? "", reason },
      });
    }

    const composition = [...taken].sort();
    if (composition.length !== size) {
      throw new Error(
        `${competition.id} nível ${division.level}: ${composition.length} clubes em vez de ${size}`,
      );
    }
    // Escreve no mesmo objeto que vai para `result.compositions` (não cria um novo).
    const into = resolved[competition.id];
    if (into) into[division.level] = composition;
    result.origins[competition.id] = { ...(result.origins[competition.id] ?? {}), ...origins };
    for (const berth of berths) {
      for (const item of filled.get(berth.id) ?? []) {
        const record: QualificationEntry = {
          competitionId: competition.id,
          level: division.level,
          berthId: berth.id,
          clubId: item.clubId,
          via: item.via,
          ...(item.passedFrom ? { passedFrom: item.passedFrom } : {}),
        };
        result.record.entries.push(record);
        const entry: Entry = {
          ...(berth.entry?.stage && berth.entry.stage > 1 ? { stage: berth.entry.stage } : {}),
          ...(berth.entry?.phase && berth.entry.phase > 1 ? { phase: berth.entry.phase } : {}),
        };
        if (entry.stage !== undefined || entry.phase !== undefined) {
          const byLevel = result.entrants[competition.id] ?? {};
          byLevel[division.level] = { ...(byLevel[division.level] ?? {}), [item.clubId]: entry };
          result.entrants[competition.id] = byLevel;
        }
      }
    }
  }
}
