import type { CareerSeasonState } from "../career/season-state";
import { annualWageBill } from "../finance/create";
import { clubStrength } from "../season/credibility";
import { standings } from "../season/standings";
import { CONTINENTAL_TUNING } from "./rules";

/**
 * Medidas de equilíbrio de uma competição entre países em várias temporadas (022 R9, SC-001 a
 * SC-003): quem ganha, com que força, a economia dos clubes assíduos e a reputação. Pura; serve ao
 * teste de simulação longa e à ferramenta `sim:world --continental`.
 */

type Snapshot = Pick<CareerSeasonState, "world" | "finances" | "league" | "competitions">;

/**
 * Resumo compacto de uma temporada, tirado do começo e do fim dela: guarda só números, para uma
 * simulação de 30 temporadas não segurar na memória o estado inteiro de cada uma.
 */
export interface ContinentalSnapshot {
  number: number;
  champion: string | undefined;
  /** Participantes no começo da temporada, com país e força. */
  participants: string[];
  country: Record<string, string>;
  strength: Record<string, number>;
  crisis: Record<string, boolean>;
  cash: Record<string, number>;
  revenue: Record<string, number>;
  awards: Record<string, number>;
  reputation: Record<string, number>;
  /** Folha anual mediana do mundo no fim da temporada. */
  wage: number;
  /** Maior teto de reputação entre as competições entre países. */
  ceiling: number;
}

export interface ContinentalMeasure {
  seasons: number;
  champions: string[];
  /** Parcela das temporadas em que a força do campeão superou a média dos participantes. */
  championStrongerShare: number;
  distinctChampions: number;
  /** Maior parcela de títulos de um clube só. */
  maxTitleShare: number;
  /** Correlação de postos entre vagas ocupadas e títulos, por país. */
  slotsTitlesSpearman: number;
  /** Clubes presentes em ao menos 80% das edições. */
  assiduous: string[];
  /** Maior caixa de um assíduo acima da mediana do mundo, em folhas anuais medianas. */
  assiduousCashAboveMedianWages: number;
  /** Parcela dos clubes-temporada assíduos fora de crise. */
  assiduousHealthyShare: number;
  /** A mesma parcela para os demais clubes do mundo, de referência. */
  othersHealthyShare: number;
  /** Maior parcela da receita de um assíduo que vem dos prêmios da competição, numa temporada. */
  maxAwardsShare: number;
  /** Clubes cuja reputação passou de `max(inicial, teto)`. */
  reputationBreaches: number;
  /** Variação média da reputação dos clubes ao longo do período. */
  reputationDrift: number;
}

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

function ranks(values: readonly number[]): number[] {
  const order = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const result = new Array<number>(values.length).fill(0);
  let start = 0;
  while (start < order.length) {
    let end = start;
    while (end + 1 < order.length && order[end + 1]?.value === order[start]?.value) end++;
    for (let k = start; k <= end; k++)
      result[(order[k] as { index: number }).index] = (start + end) / 2;
    start = end + 1;
  }
  return result;
}

function spearman(a: readonly number[], b: readonly number[]): number {
  if (a.length < 2) return 0;
  const ra = ranks(a);
  const rb = ranks(b);
  const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;
  const ma = mean(ra);
  const mb = mean(rb);
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < ra.length; i++) {
    const x = (ra[i] as number) - ma;
    const y = (rb[i] as number) - mb;
    cov += x * y;
    va += x * x;
    vb += y * y;
  }
  return va === 0 || vb === 0 ? 0 : cov / Math.sqrt(va * vb);
}

export function snapshotContinental(
  start: Snapshot,
  end: Snapshot,
  competitionId: string,
): ContinentalSnapshot {
  const seasonOf = (state: Snapshot) =>
    [state.league, ...state.competitions].find((entry) => entry.competitionId === competitionId)
      ?.divisions[0];
  const season = seasonOf(end);
  const participants = [...(seasonOf(start)?.clubIds ?? season?.clubIds ?? [])];
  const champion = season ? standings(season, end.world)[0]?.clubId : undefined;
  const number = end.league.number;
  const revenue: Record<string, number> = {};
  const awards: Record<string, number> = {};
  for (const entry of end.finances.ledger) {
    if (entry.season !== number || entry.amount <= 0) continue;
    if (["gate", "sponsorship", "prize"].includes(entry.category)) {
      revenue[entry.clubId] = (revenue[entry.clubId] ?? 0) + entry.amount;
    }
    if (entry.category === "prize" && entry.competitionId === competitionId) {
      awards[entry.clubId] = (awards[entry.clubId] ?? 0) + entry.amount;
    }
  }
  return {
    number,
    champion,
    participants,
    country: Object.fromEntries(
      participants.map((id) => [
        id,
        start.world.clubs.find((club) => club.id === id)?.countryId ?? "",
      ]),
    ),
    strength: Object.fromEntries(participants.map((id) => [id, clubStrength(start.world, id)])),
    crisis: Object.fromEntries(
      end.world.clubs.map((club) => [club.id, end.finances.clubs[club.id]?.inCrisis === true]),
    ),
    cash: Object.fromEntries(
      end.world.clubs.map((club) => [club.id, end.finances.clubs[club.id]?.cash ?? 0]),
    ),
    revenue,
    awards,
    reputation: Object.fromEntries(start.world.clubs.map((club) => [club.id, club.reputation])),
    wage: median(
      end.world.clubs.map((club) =>
        annualWageBill(end.world, club.id, end.world.manifest.referenceDate),
      ),
    ),
    ceiling: Math.max(
      ...start.world.competitions
        .filter((entry) => entry.countryId === undefined)
        .map((entry) => entry.awards?.reputationCeiling ?? CONTINENTAL_TUNING.reputationCeiling),
      0,
    ),
  };
}

/** Reputação de todos os clubes no fim da última temporada (para o deslocamento e o teto). */
export function measureContinental(
  snapshots: readonly ContinentalSnapshot[],
  finalReputation: Record<string, number>,
): ContinentalMeasure {
  const champions = snapshots.flatMap((entry) => (entry.champion ? [entry.champion] : []));
  const seasons = champions.length;
  let stronger = 0;
  const editions = new Map<string, number>();
  const slotsByCountry = new Map<string, number>();
  const titlesByCountry = new Map<string, number>();
  for (const entry of snapshots) {
    if (!entry.champion) continue;
    const mean =
      entry.participants.reduce((sum, id) => sum + (entry.strength[id] ?? 0), 0) /
      Math.max(1, entry.participants.length);
    if ((entry.strength[entry.champion] ?? 0) > mean) stronger++;
    for (const id of entry.participants) {
      editions.set(id, (editions.get(id) ?? 0) + 1);
      const country = entry.country[id] ?? "";
      slotsByCountry.set(country, (slotsByCountry.get(country) ?? 0) + 1);
    }
    const country = entry.country[entry.champion] ?? "";
    titlesByCountry.set(country, (titlesByCountry.get(country) ?? 0) + 1);
  }
  const titles = new Map<string, number>();
  for (const champion of champions) titles.set(champion, (titles.get(champion) ?? 0) + 1);
  const countries = [...slotsByCountry.keys()].sort();
  const assiduous = [...editions]
    .filter(([, count]) => count >= 0.8 * seasons)
    .map(([id]) => id)
    .sort();
  const assiduousSet = new Set(assiduous);

  const last = snapshots.at(-1);
  let cashAbove = 0;
  if (last) {
    const cashMedian = median(Object.values(last.cash));
    for (const id of assiduous) {
      cashAbove = Math.max(cashAbove, ((last.cash[id] ?? 0) - cashMedian) / Math.max(1, last.wage));
    }
  }
  let healthy = 0;
  let healthyTotal = 0;
  let othersHealthy = 0;
  let othersTotal = 0;
  let maxAwardsShare = 0;
  for (const entry of snapshots) {
    for (const [id, inCrisis] of Object.entries(entry.crisis)) {
      if (assiduousSet.has(id)) {
        healthyTotal++;
        if (!inCrisis) healthy++;
        const revenue = entry.revenue[id] ?? 0;
        if (revenue > 0)
          maxAwardsShare = Math.max(maxAwardsShare, (entry.awards[id] ?? 0) / revenue);
      } else {
        othersTotal++;
        if (!inCrisis) othersHealthy++;
      }
    }
  }

  const first = snapshots[0];
  let breaches = 0;
  let sum = 0;
  if (first) {
    for (const [id, now] of Object.entries(finalReputation)) {
      const before = first.reputation[id] ?? now;
      sum += now - before;
      if (now > Math.max(before, first.ceiling)) breaches++;
    }
  }
  return {
    seasons,
    champions,
    championStrongerShare: seasons === 0 ? 0 : stronger / seasons,
    distinctChampions: titles.size,
    maxTitleShare: seasons === 0 ? 0 : Math.max(0, ...titles.values()) / seasons,
    slotsTitlesSpearman: spearman(
      countries.map((country) => slotsByCountry.get(country) ?? 0),
      countries.map((country) => titlesByCountry.get(country) ?? 0),
    ),
    assiduous,
    assiduousCashAboveMedianWages: cashAbove,
    assiduousHealthyShare: healthyTotal === 0 ? 1 : healthy / healthyTotal,
    othersHealthyShare: othersTotal === 0 ? 1 : othersHealthy / othersTotal,
    maxAwardsShare,
    reputationBreaches: breaches,
    reputationDrift: sum / Math.max(1, Object.keys(finalReputation).length),
  };
}
