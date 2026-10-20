import { beforeAll, describe, expect, it } from "vitest";
import { createLeagueSeason } from "../../src/career/league";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { createFans } from "../../src/fans/create";
import type { FansState } from "../../src/fans/types";
import { annualWageBill, createFinances } from "../../src/finance/create";
import { advanceCareer } from "../../src/finance/round";
import type { FinanceState } from "../../src/finance/types";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket, type MarketState } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import type { RenewalState } from "../../src/renewal/types";
import { spearman } from "../../src/season/credibility";
import { competitionId } from "../career/helpers";
import { testWorld } from "./helpers";

// Critérios de aceite da 008 (Princípio V, research.md R10). Limites declarados aqui.
const SEASONS = 30;
const MAX_ABOVE_MEDIAN_IN_WAGE_BILLS = 4;
const MIN_HEALTHY_SHARE_EACH_SEASON = 0.8;
const MIN_HEALTHY_SHARE_AVERAGE = 0.9;
const MIN_SPEARMAN_REPUTATION_CASH = 0.4;
const MEDIAN_CASH_MAX_IN_WAGE_BILLS = 5;
/** Ninguém é o clube do jogador: todos os clubes seguem a IA. */
const NO_MANAGER = "";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

interface SeasonEnd {
  cash: Map<string, number>;
  crisis: number;
}

function simulate(careerSeed: string): SeasonEnd[] {
  const base = testWorld();
  const created = createLeagueSeason(base, { competitionId: competitionId(), careerSeed });
  if (!created.ok) throw new Error("falhou");
  // Desde a 010 todo jogador tem contrato e os contratos vencem: a economia é verificada com
  // renovações da IA, livres e salários contratuais.
  let world: CompletedBank = ensureContracts(base, created.league.year, careerSeed);
  let market: MarketState = emptyMarket();
  let league: LeagueSeason = created.league;
  let finances: FinanceState = createFinances(world, league);
  // Desde a 009 toda carreira tem renovação do mundo (evolução, aposentadoria, jovens): a economia
  // é verificada nesse cenário real, não com elencos congelados.
  let renewal: RenewalState = initialRenewal(world);
  let history: SeasonHistoryEntry[] = [];
  // Desde a 013 o humor das torcidas mexe na bilheteria: a economia é verificada com ele.
  let fans: FansState = createFans(world, league);
  const ends: SeasonEnd[] = [];
  for (let season = 0; season < SEASONS; season++) {
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      NO_MANAGER,
      undefined,
      { state: renewal, careerSeed },
      // Mercado da IA ativo (011): compras, empréstimos, livres e propostas a cada rodada.
      { state: market, careerSeed },
      undefined,
      { state: fans },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed,
      finances: played.finances,
      managerClubId: NO_MANAGER,
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
      fans: played.fans ?? fans,
    });
    if (!turned.ok || !turned.finances) throw new Error(JSON.stringify(turned));
    market = turned.market ?? market;
    fans = turned.fans ?? fans;
    ({ league, history, world } = turned);
    finances = turned.finances;
    renewal = turned.renewal ?? renewal;
    const clubs = Object.values(finances.clubs);
    ends.push({
      cash: new Map(clubs.map((club) => [club.clubId, club.cash])),
      crisis: clubs.filter((club) => club.inCrisis).length,
    });
  }
  return ends;
}

describe.each(["economia-1", "economia-2"])(
  `economia em ${SEASONS} temporadas (%s)`,
  (seed) => {
    const world = testWorld();
    let ends: SeasonEnd[] = [];
    let clubIds: string[] = [];
    let medianWages = 0;
    beforeAll(() => {
      ends = simulate(seed);
      clubIds = [...(ends[0]?.cash.keys() ?? [])].sort();
      medianWages = median(
        clubIds.map((clubId) => annualWageBill(world, clubId, world.manifest.referenceDate)),
      );
    }, 600_000);

    it("nenhum clube acumula caixa absurdo em relação aos demais (SC-001)", () => {
      for (const end of ends) {
        const cash = [...end.cash.values()];
        expect(Math.max(...cash) - median(cash)).toBeLessThanOrEqual(
          MAX_ABOVE_MEDIAN_IN_WAGE_BILLS * medianWages,
        );
      }
    });

    it("a maioria dos clubes não quebra (SC-002)", () => {
      for (const end of ends) {
        expect(1 - end.crisis / clubIds.length).toBeGreaterThanOrEqual(
          MIN_HEALTHY_SHARE_EACH_SEASON,
        );
      }
      const average =
        ends.reduce((sum, end) => sum + (1 - end.crisis / clubIds.length), 0) / ends.length;
      expect(average).toBeGreaterThanOrEqual(MIN_HEALTHY_SHARE_AVERAGE);
    });

    it("clubes grandes continuam financeiramente mais fortes (SC-003)", () => {
      const reputation = clubIds.map(
        (clubId) => world.clubs.find((club) => club.id === clubId)?.reputation ?? 0,
      );
      const meanCash = clubIds.map(
        (clubId) => ends.reduce((sum, end) => sum + (end.cash.get(clubId) ?? 0), 0) / ends.length,
      );
      expect(spearman(reputation, meanCash)).toBeGreaterThanOrEqual(MIN_SPEARMAN_REPUTATION_CASH);
    });

    it("a mediana do caixa no fim fica numa faixa saudável", () => {
      const last = median([...(ends.at(-1)?.cash.values() ?? [])]);
      expect(last).toBeGreaterThanOrEqual(0);
      expect(last).toBeLessThanOrEqual(MEDIAN_CASH_MAX_IN_WAGE_BILLS * medianWages);
    });
  },
  600_000,
);
