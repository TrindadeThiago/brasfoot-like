import type { Fact } from "./facts";
import type { ClubRecordKind, HeadlineVars, LeagueRecordKind, RecordEntry, Records } from "./types";

/** Uma marca que pode virar recorde (da liga ou de um clube). */
export interface RecordCandidate {
  scope: "league" | "club";
  kind: LeagueRecordKind | ClubRecordKind;
  /** Clube dono do recorde (escopo "club"). */
  owner?: string;
  entry: RecordEntry;
  /**
   * Superar o próprio recorde na mesma temporada (ex.: o artilheiro marcando de novo) atualiza sem
   * manchete.
   */
  sameHolder?: (previous: RecordEntry) => boolean;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Estritamente melhor: valor maior, ou igual com desempate maior quando há desempate. */
export function beats(next: RecordEntry, previous: RecordEntry): boolean {
  if (next.value !== previous.value) return next.value > previous.value;
  return (
    next.secondary !== undefined &&
    previous.secondary !== undefined &&
    next.secondary > previous.secondary
  );
}

function entryVars(prefix: string, entry: RecordEntry): HeadlineVars {
  const vars: HeadlineVars = {
    [`${prefix}Value`]: entry.value,
    [`${prefix}Year`]: entry.year,
  };
  if (entry.clubId) vars[`${prefix}Club`] = entry.clubId;
  if (entry.opponentId) vars[`${prefix}Opponent`] = entry.opponentId;
  if (entry.playerName) vars[`${prefix}Player`] = entry.playerName;
  if (entry.score) {
    vars[`${prefix}GoalsFor`] = entry.score[0];
    vars[`${prefix}GoalsAgainst`] = entry.score[1];
  }
  return vars;
}

/**
 * Atualiza os recordes com as marcas da rodada (research.md R5). Primeira marca de um tipo só é
 * registrada; superar (estritamente) gera manchete com o recorde anterior; empatar não conta.
 */
export function updateRecords(
  records: Records,
  candidates: readonly RecordCandidate[],
): { records: Records; broken: Fact[] } {
  const next = clone(records);
  const broken: Fact[] = [];
  for (const candidate of candidates) {
    const owner = candidate.owner ?? "";
    if (candidate.scope === "club" && !next.clubs[owner]) next.clubs[owner] = {};
    const holder = (candidate.scope === "league" ? next.league : next.clubs[owner]) as Record<
      string,
      RecordEntry | undefined
    >;
    const previous = holder[candidate.kind];
    if (!previous) {
      holder[candidate.kind] = candidate.entry;
      continue;
    }
    if (!beats(candidate.entry, previous)) continue;
    holder[candidate.kind] = candidate.entry;
    if (candidate.sameHolder?.(previous)) continue;
    const clubIds = [candidate.entry.clubId ?? candidate.owner ?? ""].filter(Boolean);
    broken.push({
      type: "record",
      clubIds,
      playerIds: candidate.entry.playerId ? [candidate.entry.playerId] : [],
      vars: {
        scope: candidate.scope,
        kind: candidate.kind,
        ...(candidate.owner ? { owner: candidate.owner } : {}),
        ...entryVars("new", candidate.entry),
        ...entryVars("prev", previous),
      },
    });
  }
  return { records: next, broken };
}
