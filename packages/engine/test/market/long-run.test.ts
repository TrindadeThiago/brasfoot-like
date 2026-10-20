import { beforeAll, describe, expect, it } from "vitest";
import { createLeagueSeason } from "../../src/career/league";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { createFinances } from "../../src/finance/create";
import { advanceCareer } from "../../src/finance/round";
import type { FinanceState } from "../../src/finance/types";
import { DEFAULT_AI_MARKET } from "../../src/market/ai/rules";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket, type MarketState, type TransferRecord } from "../../src/market/types";
import { POSITIONS } from "../../src/model/catalogs";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import { squadProblems } from "../../src/renewal/squads";
import type { RenewalState } from "../../src/renewal/types";
import { spearman } from "../../src/season/credibility";
import { competitionId, testWorld } from "../career/helpers";

// Critérios de aceite da 011 (Princípio V, research.md R11). Limites declarados aqui.
const SEASONS = 30;
const MIN_UPWARD_SHARE = 0.6;
const MIN_SPEARMAN_REPUTATION_STRENGTH = 0.5;
const MAX_FREE_AGENTS = 150;
const NO_MANAGER = "";

interface SeasonEnd {
  problems: string[];
  overCap: string[];
  freeAgents: number;
  /** Compras entre clubes da IA por janela da temporada. */
  windowDeals: number[];
  transfers: (TransferRecord & { strength: number; top: boolean })[];
}

interface Simulation {
  ends: SeasonEnd[];
  world: CompletedBank;
  league: LeagueSeason;
}

function topThreshold(world: CompletedBank): number {
  const strengths = world.players.map((player) => player.strength).sort((a, b) => b - a);
  return strengths[Math.floor(strengths.length / 10)] ?? 0;
}

function simulate(careerSeed: string): Simulation {
  const base = testWorld();
  const created = createLeagueSeason(base, { competitionId: competitionId(), careerSeed });
  if (!created.ok) throw new Error("falhou");
  let world: CompletedBank = ensureContracts(base, created.league.year, careerSeed);
  let league: LeagueSeason = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal: RenewalState = initialRenewal(world);
  let market: MarketState = emptyMarket();
  let history: SeasonHistoryEntry[] = [];
  const ends: SeasonEnd[] = [];
  for (let index = 0; index < SEASONS; index++) {
    const top = topThreshold(world);
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      NO_MANAGER,
      undefined,
      { state: renewal, careerSeed },
      { state: market, careerSeed },
    );
    if (!played.ok || !played.market) throw new Error(JSON.stringify(played));
    const strengths = new Map(played.world.players.map((player) => [player.id, player.strength]));
    const purchases = played.market.log.filter(
      (entry) => entry.outcome === undefined && entry.kind === "sale" && entry.fromClubId,
    );
    const transfers = purchases.map((entry) => {
      const strength = strengths.get(entry.playerId) ?? 0;
      return { ...entry, strength, top: strength >= top };
    });
    const windowDeals = played.market.reports
      .filter((report) => report.season === league.number)
      .map((report) => report.transfers.filter((entry) => entry.kind === "sale").length);
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed,
      finances: played.finances,
      managerClubId: NO_MANAGER,
      renewal: played.renewal ?? renewal,
      market: played.market,
    });
    if (!turned.ok || !turned.finances || !turned.market) throw new Error(JSON.stringify(turned));
    ({ league, history, world } = turned);
    finances = turned.finances;
    renewal = turned.renewal ?? renewal;
    market = turned.market;
    const overCap: string[] = [];
    for (const clubId of league.divisions.flatMap((season) => season.clubIds)) {
      for (const position of POSITIONS) {
        const count = world.players.filter(
          (player) => player.clubId === clubId && player.position === position,
        ).length;
        if (count > DEFAULT_AI_MARKET.positionMax[position]) overCap.push(`${clubId}:${position}`);
      }
    }
    ends.push({
      problems: squadProblems(world, league),
      overCap,
      freeAgents: market.freeAgents.length,
      windowDeals,
      transfers,
    });
  }
  return { ends, world, league };
}

function reputation(world: CompletedBank, clubId?: string): number {
  return world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
}

describe.each(["mercado-1", "mercado-2"])(
  `mercado da IA em ${SEASONS} temporadas (%s)`,
  (seed) => {
    let simulation: Simulation;
    beforeAll(() => {
      simulation = simulate(seed);
    }, 900_000);

    it("todo clube tem elenco válido e nenhum passa do teto por posição (SC-001, SC-002)", () => {
      for (const [index, end] of simulation.ends.entries()) {
        expect(end.problems, `temporada ${index + 1}`).toEqual([]);
        expect(end.overCap, `temporada ${index + 1}`).toEqual([]);
        expect(end.freeAgents, `temporada ${index + 1} livres`).toBeLessThanOrEqual(
          MAX_FREE_AGENTS,
        );
      }
    });

    it("toda janela tem compras entre clubes da IA (SC-006)", () => {
      for (const [index, end] of simulation.ends.entries()) {
        expect(end.windowDeals.length, `temporada ${index + 1} janelas`).toBe(2);
        for (const deals of end.windowDeals) {
          expect(deals, `temporada ${index + 1}`).toBeGreaterThan(0);
        }
      }
    });

    it("os bons jogadores sobem para clubes maiores (SC-004)", () => {
      const world = simulation.world;
      const top = simulation.ends.flatMap((end) => end.transfers.filter((entry) => entry.top));
      expect(top.length).toBeGreaterThan(30);
      const upward = top.filter(
        (entry) => reputation(world, entry.toClubId) > reputation(world, entry.fromClubId),
      );
      expect(upward.length / top.length).toBeGreaterThanOrEqual(MIN_UPWARD_SHARE);
    });

    it("clubes de reputação maior têm elencos mais fortes no fim (SC-005)", () => {
      const { world, league } = simulation;
      const clubIds = league.divisions.flatMap((season) => season.clubIds);
      const strength = clubIds.map((clubId) => {
        const squad = world.players
          .filter((player) => player.clubId === clubId)
          .map((player) => player.strength)
          .sort((a, b) => b - a)
          .slice(0, 16);
        return squad.reduce((sum, value) => sum + value, 0) / squad.length;
      });
      expect(
        spearman(
          clubIds.map((clubId) => reputation(world, clubId)),
          strength,
        ),
      ).toBeGreaterThanOrEqual(MIN_SPEARMAN_REPUTATION_STRENGTH);
    });
  },
  900_000,
);
