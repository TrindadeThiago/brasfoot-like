import { beforeAll, describe, expect, it } from "vitest";
import { ageOn, seasonDate } from "../../src/calendar/date";
import { createLeagueSeason } from "../../src/career/league";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { annualWageBill, createFinances } from "../../src/finance/create";
import { advanceCareer } from "../../src/finance/round";
import type { FinanceState } from "../../src/finance/types";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket, type MarketState } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal, measureWorld } from "../../src/renewal/measure";
import { squadProblems } from "../../src/renewal/squads";
import type { EvolutionRecord, RenewalState, WorldMeasure } from "../../src/renewal/types";
import { spearman } from "../../src/season/credibility";
import { validateBank } from "../../src/validation/validate";
import { competitionId, testWorld } from "../career/helpers";

// Critérios de aceite da 009 (Princípio V, research.md R9) e da economia da 008, com renovação.
const SEASONS = 30;
const RANGES = {
  mean: [55, 63],
  p10: [43, 54],
  p50: [54, 63],
  p90: [63, 75],
  max: [78, 94],
  meanAge: [24, 27.5],
} as const;
const MIN_STARS = 1;
const MIN_YOUTH_MINUTES_GAIN_PER_SEASON = 1;
const ECONOMY = {
  maxAboveMedianInWageBills: 4,
  minHealthyShareEachSeason: 0.8,
  minHealthyShareAverage: 0.9,
  minSpearmanReputationCash: 0.4,
};
const NO_MANAGER = "";
/** Livres ao fim de cada virada (010, research.md R11). */
const MAX_FREE_AGENTS = 150;

interface SeasonEnd {
  measure: WorldMeasure;
  problems: string[];
  bankValid: boolean;
  cash: Map<string, number>;
  crisis: number;
  gaps: number[];
  freeAgents: number;
  /** Jogadores com contrato vencido no mundo depois da virada. */
  expired: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Ganho dos jovens (≤ 21) do quartil de mais minutos menos o do quartil de menos, numa evolução. */
function youthGap(world: CompletedBank, record: EvolutionRecord, date: string): number | undefined {
  const young = world.players
    .filter(
      (player) => ageOn(player.birthDate, date) <= 21 && record.deltas[player.id] !== undefined,
    )
    .map((player) => ({
      minutes: record.minutes[player.id] ?? 0,
      delta: record.deltas[player.id] ?? 0,
    }))
    .sort((a, b) => a.minutes - b.minutes);
  const quarter = Math.floor(young.length / 4);
  if (quarter === 0) return undefined;
  const mean = (items: typeof young) =>
    items.reduce((sum, item) => sum + item.delta, 0) / items.length;
  return mean(young.slice(-quarter)) - mean(young.slice(0, quarter));
}

function simulate(careerSeed: string): SeasonEnd[] {
  const base = testWorld();
  const created = createLeagueSeason(base, { competitionId: competitionId(), careerSeed });
  if (!created.ok) throw new Error("falhou");
  let world: CompletedBank = ensureContracts(base, created.league.year, careerSeed);
  let market: MarketState = emptyMarket();
  let league: LeagueSeason = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal: RenewalState = initialRenewal(world);
  let history: SeasonHistoryEntry[] = [];
  const ends: SeasonEnd[] = [];
  for (let index = 0; index < SEASONS; index++) {
    const date = seasonDate(world.manifest.referenceDate, league.year);
    const played = advanceCareer(league, finances, world, { toEnd: true }, NO_MANAGER, undefined, {
      state: renewal,
      careerSeed,
    });
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const gaps: number[] = [];
    const mid = played.renewal?.lastEvolution;
    const midGap = mid ? youthGap(world, mid, date) : undefined;
    if (midGap !== undefined) gaps.push(midGap);
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed,
      finances: played.finances,
      managerClubId: NO_MANAGER,
      renewal: played.renewal ?? renewal,
      market,
    });
    if (!turned.ok || !turned.finances || !turned.renewal || !turned.market) {
      throw new Error(JSON.stringify(turned));
    }
    market = turned.market;
    const end = turned.renewal.lastEvolution;
    const endGap = end ? youthGap(played.world, end, date) : undefined;
    if (endGap !== undefined) gaps.push(endGap);
    ({ league, history, world } = turned);
    finances = turned.finances;
    renewal = turned.renewal;
    const clubs = Object.values(finances.clubs);
    ends.push({
      measure: measureWorld(world, league, seasonDate(world.manifest.referenceDate, league.year)),
      problems: squadProblems(world, league),
      bankValid: validateBank(world).ok,
      cash: new Map(clubs.map((club) => [club.clubId, club.cash])),
      crisis: clubs.filter((club) => club.inCrisis).length,
      gaps,
      freeAgents: market.freeAgents.length,
      expired: world.players.filter((player) => (player.contract?.untilYear ?? 0) < league.year)
        .length,
    });
  }
  return ends;
}

describe.each(["renovacao-1", "renovacao-2"])(
  `mundo em ${SEASONS} temporadas (%s)`,
  (seed) => {
    let ends: SeasonEnd[] = [];
    beforeAll(() => {
      ends = simulate(seed);
    }, 600_000);

    it("força média e percentis ficam nas faixas e sempre há craque (SC-001, SC-003)", () => {
      for (const [index, end] of ends.entries()) {
        const label = `temporada ${index + 1}`;
        for (const key of ["mean", "p10", "p50", "p90", "max"] as const) {
          const [min, max] = RANGES[key];
          expect(end.measure[key], `${label} ${key}`).toBeGreaterThanOrEqual(min);
          expect(end.measure[key], `${label} ${key}`).toBeLessThanOrEqual(max);
        }
        expect(end.measure.stars, `${label} craques`).toBeGreaterThanOrEqual(MIN_STARS);
      }
    });

    it("com contratos, o grupo de livres fica pequeno e ninguém joga com contrato vencido (SC-006)", () => {
      for (const [index, end] of ends.entries()) {
        expect(end.freeAgents, `temporada ${index + 1} livres`).toBeLessThanOrEqual(
          MAX_FREE_AGENTS,
        );
        expect(end.expired, `temporada ${index + 1} vencidos`).toBe(0);
      }
    });

    it("todo clube tem elenco válido e o mundo segue o schema do banco (SC-002)", () => {
      for (const end of ends) {
        expect(end.problems).toEqual([]);
        expect(end.bankValid).toBe(true);
      }
    });

    it("a idade média fica na faixa (SC-005)", () => {
      for (const end of ends) {
        expect(end.measure.meanAge).toBeGreaterThanOrEqual(RANGES.meanAge[0]);
        expect(end.measure.meanAge).toBeLessThanOrEqual(RANGES.meanAge[1]);
      }
    });

    it("jovens com mais minutos evoluem mais (SC-004)", () => {
      const gaps = ends.flatMap((end) => end.gaps);
      const perSeason = (2 * gaps.reduce((sum, gap) => sum + gap, 0)) / gaps.length;
      expect(perSeason).toBeGreaterThanOrEqual(MIN_YOUTH_MINUTES_GAIN_PER_SEASON);
    });

    it("a economia da 008 continua saudável com renovação (SC-006)", () => {
      const world = testWorld();
      const clubIds = [...(ends[0]?.cash.keys() ?? [])].sort();
      const wages = median(
        clubIds.map((clubId) => annualWageBill(world, clubId, world.manifest.referenceDate)),
      );
      for (const end of ends) {
        const cash = [...end.cash.values()];
        expect(Math.max(...cash) - median(cash)).toBeLessThanOrEqual(
          ECONOMY.maxAboveMedianInWageBills * wages,
        );
        expect(1 - end.crisis / clubIds.length).toBeGreaterThanOrEqual(
          ECONOMY.minHealthyShareEachSeason,
        );
      }
      const average =
        ends.reduce((sum, end) => sum + (1 - end.crisis / clubIds.length), 0) / ends.length;
      expect(average).toBeGreaterThanOrEqual(ECONOMY.minHealthyShareAverage);
      const reputation = clubIds.map(
        (clubId) => world.clubs.find((club) => club.id === clubId)?.reputation ?? 0,
      );
      const meanCash = clubIds.map(
        (clubId) => ends.reduce((sum, end) => sum + (end.cash.get(clubId) ?? 0), 0) / ends.length,
      );
      expect(spearman(reputation, meanCash)).toBeGreaterThanOrEqual(
        ECONOMY.minSpearmanReputationCash,
      );
    });

    it("repetir a carreira dá o mesmo mundo (SC-007)", () => {
      const again = simulate(seed);
      expect(again.map((end) => end.measure)).toEqual(ends.map((end) => end.measure));
    }, 600_000);
  },
  600_000,
);
