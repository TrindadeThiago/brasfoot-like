import type { CompletedBank } from "../model/types.js";
import { SEASON_CREDIBILITY_LIMITS } from "./limits.js";
import { standings } from "./standings.js";
import { topScorers } from "./stats.js";
import type { Season, SeasonReport } from "./types.js";

const TOP_N = 16;

/** Força inicial de um clube: média dos 16 jogadores mais fortes (mesmo critério da 001). */
export function clubStrength(world: CompletedBank, clubId: string): number {
  const top = world.players
    .filter((player) => player.clubId === clubId)
    .map((player) => player.strength)
    .sort((a, b) => b - a)
    .slice(0, TOP_N);
  return top.length === 0 ? 0 : top.reduce((sum, value) => sum + value, 0) / top.length;
}

/** Postos (1 = maior valor), com empates recebendo a média dos postos. */
function ranks(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => b.value - a.value);
  const result = new Array<number>(values.length).fill(0);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1]?.value === order[start]?.value) end++;
    const average = (start + end) / 2 + 1;
    for (let k = start; k <= end; k++) result[(order[k] as { index: number }).index] = average;
    start = end + 1;
  }
  return result;
}

/** Correlação de postos de Spearman entre duas séries (postos médios em empates). */
export function spearman(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length < 2) return 0;
  const ra = ranks(a);
  const rb = ranks(b);
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < ra.length; index++) {
    const da = (ra[index] as number) - ma;
    const db = (rb[index] as number) - mb;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  return varianceA === 0 || varianceB === 0 ? 0 : covariance / Math.sqrt(varianceA * varianceB);
}

/** Métricas de credibilidade de uma temporada encerrada (research R10). */
export function seasonReport(season: Season, world: CompletedBank): SeasonReport {
  const table = standings(season, world);
  const strength = new Map(season.clubIds.map((clubId) => [clubId, clubStrength(world, clubId)]));
  const byStrength = [...season.clubIds].sort(
    (a, b) => (strength.get(b) ?? 0) - (strength.get(a) ?? 0) || a.localeCompare(b),
  );
  const champion = table[0];
  const last = table[table.length - 1];
  const matches = season.records.length;
  const goals = season.records.reduce(
    (sum, record) => sum + record.score.home + record.score.away,
    0,
  );
  const draws = season.records.filter((record) => record.score.home === record.score.away).length;
  return {
    championId: champion?.clubId ?? "",
    championPoints: champion?.points ?? 0,
    lastPoints: last?.points ?? 0,
    championStrengthRank: byStrength.indexOf(champion?.clubId ?? "") + 1,
    unbeatenClubs: table.filter((row) => row.played > 0 && row.losses === 0).length,
    // Posição: menor é melhor, então correlaciona força com o negativo da posição.
    spearman: spearman(
      table.map((row) => strength.get(row.clubId) ?? 0),
      table.map((row) => -row.position),
    ),
    goalsPerMatch: matches === 0 ? 0 : goals / matches,
    drawRate: matches === 0 ? 0 : draws / matches,
    topScorerGoals: topScorers(season, 1)[0]?.goals ?? 0,
  };
}

export interface CredibilityCheck {
  criterion: string;
  value: number;
  min?: number;
  max?: number;
  ok: boolean;
}

/** Agrega relatórios de várias temporadas e compara com as faixas (FR-030 a FR-037). */
export function aggregateCredibility(reports: readonly SeasonReport[]): CredibilityCheck[] {
  const limits = SEASON_CREDIBILITY_LIMITS;
  const n = reports.length || 1;
  const rate = (predicate: (report: SeasonReport) => boolean) =>
    reports.filter(predicate).length / n;
  const within = (value: number, [min, max]: readonly [number, number]) =>
    value >= min && value <= max;
  const range = (
    criterion: string,
    value: number,
    [min, max]: readonly [number, number],
  ): CredibilityCheck => ({
    criterion,
    value,
    min,
    max,
    ok: within(value, [min, max]),
  });
  const atLeast = (criterion: string, value: number, min: number): CredibilityCheck => ({
    criterion,
    value,
    min,
    ok: value >= min,
  });
  const atMost = (criterion: string, value: number, max: number): CredibilityCheck => ({
    criterion,
    value,
    max,
    ok: value <= max,
  });
  const spearmans = reports.map((report) => report.spearman);
  return [
    range(
      "championTop4Rate",
      rate((report) => report.championStrengthRank <= 4),
      limits.championTop4Rate,
    ),
    range(
      "strongestChampionRate",
      rate((report) => report.championStrengthRank === 1),
      limits.strongestChampionRate,
    ),
    atLeast(
      "championPointsRate",
      rate((report) => within(report.championPoints, limits.championPoints)),
      limits.minChampionPointsRate,
    ),
    atLeast(
      "lastPointsRate",
      rate((report) => within(report.lastPoints, limits.lastPoints)),
      limits.minLastPointsRate,
    ),
    atMost(
      "unbeatenRate",
      rate((report) => report.unbeatenClubs > 0),
      limits.maxUnbeatenRate,
    ),
    atLeast(
      "meanSpearman",
      spearmans.reduce((sum, value) => sum + value, 0) / n,
      limits.minMeanSpearman,
    ),
    {
      criterion: "minSpearman",
      value: Math.min(...spearmans),
      min: limits.minSeasonSpearman,
      ok: Math.min(...spearmans) > limits.minSeasonSpearman,
    },
    atLeast(
      "scoringRate",
      rate(
        (report) =>
          within(report.goalsPerMatch, limits.goalsPerMatch) &&
          within(report.drawRate, limits.drawRate),
      ),
      limits.minScoringRate,
    ),
    atLeast(
      "topScorerRate",
      rate((report) => within(report.topScorerGoals, limits.topScorerGoals)),
      limits.minTopScorerRate,
    ),
  ];
}
