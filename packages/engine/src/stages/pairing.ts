import type { KnockoutHomeRule } from "../model/catalogs";
import { createRng } from "../rng/xoshiro";
import type { Qualifier } from "./types";

/** Chaveamento da 1ª fase eliminatória depois de uma fase de pontos (019 R7). */

/** Classificado com o que as regras de mando leem. */
export interface PairEntry extends Qualifier {
  reputation: number;
  /** Nível da divisão do clube na competição principal (1 = a mais alta). */
  division: number;
}

export interface PairOptions {
  home: KnockoutHomeRule;
  seed: string;
}

export interface Pair {
  home: string;
  away: string;
}

/** Do melhor ao pior: posição no grupo, depois classificação geral, depois id. */
function bySeed(a: PairEntry, b: PairEntry): number {
  return (
    a.groupPosition - b.groupPosition ||
    a.overallPosition - b.overallPosition ||
    (a.clubId < b.clubId ? -1 : a.clubId > b.clubId ? 1 : 0)
  );
}

const sameGroup = (a: PairEntry, b: PairEntry) => a.group !== undefined && a.group === b.group;

/** O i-ésimo melhor enfrenta o i-ésimo pior; pares do mesmo grupo trocam de parceiro se possível. */
function seedPairs(entries: readonly PairEntry[]): [PairEntry, PairEntry][] {
  const sorted = [...entries].sort(bySeed);
  const half = sorted.length / 2;
  const upper = sorted.slice(0, half);
  const lower = sorted.slice(half).reverse();
  for (let index = 0; index < half; index++) {
    if (!sameGroup(upper[index] as PairEntry, lower[index] as PairEntry)) continue;
    for (let distance = 1; distance < half; distance++) {
      const candidates = [index + distance, index - distance].filter((k) => k >= 0 && k < half);
      const found = candidates.find(
        (k) =>
          !sameGroup(upper[index] as PairEntry, lower[k] as PairEntry) &&
          !sameGroup(upper[k] as PairEntry, lower[index] as PairEntry),
      );
      if (found !== undefined) {
        const swap = lower[index] as PairEntry;
        lower[index] = lower[found] as PairEntry;
        lower[found] = swap;
        break;
      }
    }
  }
  return upper.map((entry, index) => [entry, lower[index] as PairEntry]);
}

/** Quem joga em casa (a ida, em ida e volta) segundo a regra da fase. */
function hostOf(
  a: PairEntry,
  b: PairEntry,
  rule: KnockoutHomeRule,
  coin: () => boolean,
): [PairEntry, PairEntry] {
  if (rule === "overall" && a.overallPosition !== b.overallPosition) {
    return a.overallPosition < b.overallPosition ? [a, b] : [b, a];
  }
  if (rule === "ranking") {
    if (a.reputation !== b.reputation) return a.reputation > b.reputation ? [a, b] : [b, a];
    return a.clubId < b.clubId ? [a, b] : [b, a];
  }
  if (rule === "division" && a.division !== b.division) {
    // Joga em casa o de divisão mais baixa (nível numérico maior).
    return a.division > b.division ? [a, b] : [b, a];
  }
  return coin() ? [a, b] : [b, a];
}

/**
 * Confrontos da primeira fase eliminatória a partir dos classificados de uma fase de pontos
 * (FR-019): o melhor contra o pior, evitando o mesmo grupo quando uma troca resolve; o mandante
 * segue a regra da fase. Determinístico pela seed e independente da ordem de entrada.
 */
export function pairByPosition(entries: readonly PairEntry[], options: PairOptions): Pair[] {
  if (entries.length % 2 !== 0) {
    throw new Error(`pareamento com número ímpar de classificados: ${entries.length}`);
  }
  const coin = createRng(options.seed).fork("home");
  return seedPairs(entries).map(([top, bottom]) => {
    const [home, away] = hostOf(top, bottom, options.home, () => coin.float() < 0.5);
    return { home: home.clubId, away: away.clubId };
  });
}

/** Entrada que uma origem da tabela de confrontos (`A1`, `B2`, `T3`, `X1`) designa. */
function resolveOrigin(entries: readonly PairEntry[], origin: string): PairEntry | undefined {
  const match = /^([A-Z])(\d+)$/.exec(origin);
  if (!match) return undefined;
  const letter = match[1] as string;
  const position = Number(match[2]);
  if (letter === "T") {
    return entries.find((entry) => entry.group === undefined && entry.groupPosition === position);
  }
  if (letter === "X") {
    const extras = entries
      .filter((entry) => entry.extra)
      .sort((a, b) => a.overallPosition - b.overallPosition);
    return extras[position - 1];
  }
  return entries.find(
    (entry) => !entry.extra && entry.group === letter && entry.groupPosition === position,
  );
}

/**
 * Confrontos da primeira fase eliminatória por uma tabela própria de origens (019 R7): cada
 * classificado aparece uma vez; o mandante segue a regra da fase. Lança se uma origem não
 * existe ou se a tabela não usa todos os classificados (a validação do banco já recusa isso).
 */
export function pairByTable(
  entries: readonly PairEntry[],
  table: readonly (readonly [string, string])[],
  options: PairOptions,
): Pair[] {
  const coin = createRng(options.seed).fork("home");
  const used = new Set<string>();
  const pairs: Pair[] = [];
  for (const [first, second] of table) {
    const a = resolveOrigin(entries, first);
    const b = resolveOrigin(entries, second);
    if (!a || !b || a.clubId === b.clubId || used.has(a.clubId) || used.has(b.clubId)) {
      throw new Error(`tabela de confrontos inválida: ${first} × ${second}`);
    }
    used.add(a.clubId);
    used.add(b.clubId);
    const [home, away] = hostOf(a, b, options.home, () => coin.float() < 0.5);
    pairs.push({ home: home.clubId, away: away.clubId });
  }
  if (used.size !== entries.length) {
    throw new Error(`a tabela de confrontos usa ${used.size} de ${entries.length} classificados`);
  }
  return pairs;
}
