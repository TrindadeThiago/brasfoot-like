import { beforeAll, describe, expect, it } from "vitest";
import { createBoard } from "../../src/board/create";
import { pendingOffers } from "../../src/board/offers";
import { DEFAULT_BOARD } from "../../src/board/rules";
import type { BoardState } from "../../src/board/types";
import { createLeagueSeason, leagueTotalRounds } from "../../src/career/league";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { createFinances } from "../../src/finance/create";
import { advanceCareer } from "../../src/finance/round";
import type { FinanceState } from "../../src/finance/types";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket, type MarketState } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import type { RenewalState } from "../../src/renewal/types";
import { standings } from "../../src/season/standings";
import { competitionId, testWorld } from "../career/helpers";

// Critérios da 012 (Princípio V, research.md R13). Limites declarados aqui.
const SEASONS = 30;
const MIN_CHANGE_SHARE = 0.05;
const MAX_CHANGE_SHARE = 0.35;
const MIN_BELOW_EXPECTATION_SHARE = 0.7;
const BOT_SEASONS = 10;

interface SeasonStats {
  /** Clubes da IA que trocaram de técnico na temporada (meio ou fim). */
  changed: string[];
  /** Dos que trocaram, os que terminaram abaixo da expectativa. */
  below: string[];
  clubs: number;
  /** Vagas abertas há mais tempo que o limite no fim da temporada. */
  staleVacancies: number;
  freeCoaches: number;
  /** Desempregado sem proposta depois da virada. */
  stuckUnemployed: boolean;
  managerClubId: string | null;
  managerReputation: number;
  /** Reputação dos clubes que fizeram proposta ao técnico na temporada. */
  offerReputations: number[];
}

interface Career {
  world: CompletedBank;
  league: LeagueSeason;
  finances: FinanceState;
  renewal: RenewalState;
  market: MarketState;
  board: BoardState;
  history: SeasonHistoryEntry[];
}

function startCareer(
  careerSeed: string,
  manager?: { clubId: string; noFiring: boolean; reputation?: number },
): Career {
  const base = testWorld();
  const created = createLeagueSeason(base, { competitionId: competitionId(), careerSeed });
  if (!created.ok) throw new Error("falhou");
  const world = ensureContracts(base, created.league.year, careerSeed);
  const league = created.league;
  const finances = createFinances(world, league);
  return {
    world,
    league,
    finances,
    renewal: initialRenewal(world),
    market: emptyMarket(),
    board: createBoard(world, league, finances, careerSeed, manager),
    history: [],
  };
}

function coachesOf(board: BoardState): Map<string, string | null> {
  return new Map(Object.values(board.clubs).map((club) => [club.clubId, club.coachId]));
}

/**
 * Joga `seasons` temporadas (com mercado e diretoria). `accept` decide se o técnico aceita uma
 * proposta pendente na virada (o bot só responde entre temporadas).
 */
function simulate(
  careerSeed: string,
  seasons: number,
  manager?: { clubId: string; noFiring: boolean; reputation?: number },
): SeasonStats[] {
  let career = startCareer(careerSeed, manager);
  const stats: SeasonStats[] = [];
  for (let index = 0; index < seasons; index++) {
    const before = coachesOf(career.board);
    const expectations = new Map(
      Object.values(career.board.clubs).map((club) => [club.clubId, club.goals?.sport.expectation]),
    );
    const firedMidSeason = new Set<string>();
    let state = career;
    const total = leagueTotalRounds(state.league);
    for (let round = 0; round < total; round++) {
      const played = advanceCareer(
        state.league,
        state.finances,
        state.world,
        { rounds: 1 },
        state.board.manager.clubId ?? "",
        undefined,
        { state: state.renewal, careerSeed },
        { state: state.market, careerSeed },
        { state: state.board, careerSeed },
      );
      if (!played.ok || !played.board || !played.market || !played.renewal) {
        throw new Error(JSON.stringify(played));
      }
      for (const vacancy of played.board.vacancies) {
        if (vacancy.round === round + 1 && vacancy.season === state.league.number) {
          firedMidSeason.add(vacancy.clubId);
        }
      }
      state = {
        ...state,
        league: played.league,
        finances: played.finances,
        world: played.world,
        renewal: played.renewal,
        market: played.market,
        board: played.board,
      };
    }
    const offerReputations = state.board.offers.map(
      (offer) => state.world.clubs.find((club) => club.id === offer.clubId)?.reputation ?? 0,
    );
    const finalPosition = new Map<string, number>();
    for (const season of state.league.divisions) {
      for (const row of standings(season, state.world)) finalPosition.set(row.clubId, row.position);
    }
    const staleLimit = DEFAULT_BOARD.vacancyRounds + DEFAULT_BOARD.offerRounds + 1;
    const staleVacancies = state.board.vacancies.filter(
      (vacancy) => vacancy.season === state.league.number && total - vacancy.round > staleLimit,
    ).length;
    const turned = seasonTurnover(state.league, state.world, state.history, {
      careerSeed,
      finances: state.finances,
      managerClubId: state.board.manager.clubId ?? "",
      renewal: state.renewal,
      market: state.market,
      board: state.board,
    });
    if (!turned.ok || !turned.board || !turned.finances || !turned.renewal || !turned.market) {
      throw new Error(JSON.stringify(turned));
    }
    const after = coachesOf(turned.board);
    const changed = [...before.keys()].filter(
      (clubId) =>
        before.get(clubId) !== null &&
        clubId !== manager?.clubId &&
        (firedMidSeason.has(clubId) || after.get(clubId) !== before.get(clubId)),
    );
    const guaranteedHere = new Set(pendingOffers(turned.board).map((offer) => offer.clubId));
    const realChanges = changed.filter((clubId) => !guaranteedHere.has(clubId));
    stats.push({
      changed: realChanges,
      below: realChanges.filter(
        (clubId) => (finalPosition.get(clubId) ?? 0) > (expectations.get(clubId) ?? 99),
      ),
      clubs: before.size,
      staleVacancies,
      freeCoaches: turned.board.coaches.filter((coach) => coach.clubId === null).length,
      stuckUnemployed:
        turned.board.manager.clubId === null && pendingOffers(turned.board).length === 0,
      managerClubId: turned.board.manager.clubId,
      managerReputation: turned.board.manager.reputation,
      offerReputations,
    });
    career = {
      world: turned.world,
      league: turned.league,
      finances: turned.finances,
      renewal: turned.renewal,
      market: turned.market,
      board: turned.board,
      history: turned.history,
    };
  }
  return stats;
}

describe("diretoria em 30 temporadas sem humano (SC-004, research.md R13)", () => {
  const runs: SeasonStats[][] = [];
  beforeAll(() => {
    for (const seed of ["diretoria-longa-1", "diretoria-longa-2"])
      runs.push(simulate(seed, SEASONS));
  }, 600_000);

  it("entre 5% e 35% dos clubes da IA trocam de técnico por temporada (média)", () => {
    for (const stats of runs) {
      const shares = stats.map((season) => season.changed.length / season.clubs);
      const mean = shares.reduce((sum, value) => sum + value, 0) / shares.length;
      console.log(
        "trocas por temporada:",
        stats.map((season) => season.changed.length).join(" "),
        `média ${(mean * 100).toFixed(1)}%`,
      );
      expect(mean).toBeGreaterThanOrEqual(MIN_CHANGE_SHARE);
      expect(mean).toBeLessThanOrEqual(MAX_CHANGE_SHARE);
      expect(Math.max(...shares)).toBeLessThanOrEqual(MAX_CHANGE_SHARE + 0.15);
    }
  });

  it("ao menos 70% das trocas em clubes que terminaram abaixo da expectativa", () => {
    for (const stats of runs) {
      const changed = stats.reduce((sum, season) => sum + season.changed.length, 0);
      const below = stats.reduce((sum, season) => sum + season.below.length, 0);
      console.log(`abaixo da expectativa: ${below}/${changed}`);
      expect(below / Math.max(1, changed)).toBeGreaterThanOrEqual(MIN_BELOW_EXPECTATION_SHARE);
    }
  });

  it("vagas não ficam abertas e o pool fica no limite", () => {
    for (const stats of runs) {
      for (const season of stats) {
        expect(season.staleVacancies).toBe(0);
        expect(season.freeCoaches).toBeLessThanOrEqual(DEFAULT_BOARD.maxFreeCoaches);
      }
    }
  });
});

describe("técnico simulado (SC-002, SC-005, SC-006)", () => {
  it("sem demissão num clube fraco: nunca perde o clube em 10 temporadas", () => {
    const world = testWorld();
    const top = world.competitions[0]?.divisions.find((division) => division.level === 1);
    const weakest = [...(top?.clubIds ?? [])].sort(
      (a, b) =>
        (world.clubs.find((club) => club.id === a)?.reputation ?? 0) -
        (world.clubs.find((club) => club.id === b)?.reputation ?? 0),
    )[0] as string;
    const stats = simulate("diretoria-bot-1", BOT_SEASONS, { clubId: weakest, noFiring: true });
    for (const season of stats) expect(season.managerClubId).toBe(weakest);
  }, 600_000);

  it("demissível: nunca fica preso sem proposta depois de uma virada", () => {
    const world = testWorld();
    const top = world.competitions[0]?.divisions.find((division) => division.level === 1);
    const clubId = top?.clubIds[0] as string;
    const stats = simulate("diretoria-bot-2", BOT_SEASONS, {
      clubId,
      noFiring: false,
      reputation: 1,
    });
    for (const season of stats) expect(season.stuckUnemployed).toBe(false);
  }, 600_000);

  it("pequeno da divisão de baixo: reputação sobe e clubes maiores passam a chamar", () => {
    const world = testWorld();
    const bottom = world.competitions[0]?.divisions.find((division) => division.level === 2);
    const reputationOf = (id: string) =>
      world.clubs.find((club) => club.id === id)?.reputation ?? 0;
    const smallest = [...(bottom?.clubIds ?? [])].sort((a, b) => reputationOf(a) - reputationOf(b));
    let rising = 0;
    let calledUp = 0;
    const seeds = ["bot-a", "bot-b", "bot-c"];
    for (const [index, seed] of seeds.entries()) {
      const clubId = smallest[index] as string;
      const stats = simulate(seed, BOT_SEASONS, { clubId, noFiring: true });
      const reputations = stats.map((season) => season.managerReputation);
      console.log(`${seed}: reputação ${reputations.join(" ")}`);
      if (Math.max(...reputations) > DEFAULT_BOARD.initialReputation) rising += 1;
      if (
        stats.some((season) => season.offerReputations.some((rep) => rep > reputationOf(clubId)))
      ) {
        calledUp += 1;
      }
    }
    expect(rising).toBeGreaterThanOrEqual(2);
    expect(calledUp).toBeGreaterThanOrEqual(2);
  }, 900_000);
});
