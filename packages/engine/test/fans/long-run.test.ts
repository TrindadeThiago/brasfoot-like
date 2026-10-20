import { beforeAll, describe, expect, it } from "vitest";
import { createBoard } from "../../src/board/create";
import type { BoardState } from "../../src/board/types";
import { createLeagueSeason } from "../../src/career/league";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { createFans } from "../../src/fans/create";
import type { FansState } from "../../src/fans/types";
import { createFinances } from "../../src/finance/create";
import { advanceCareer } from "../../src/finance/round";
import type { FinanceState } from "../../src/finance/types";
import { ensureContracts } from "../../src/market/contracts";
import { emptyMarket, type MarketState } from "../../src/market/types";
import type { CompletedBank } from "../../src/model/types";
import { initialRenewal } from "../../src/renewal/measure";
import type { RenewalState } from "../../src/renewal/types";
import { competitionId, testWorld } from "../career/helpers";

// Critérios da 013 (Princípio V, research.md R12). Limites declarados aqui.
const SEASONS = 30;
const MEAN_MOOD: [number, number] = [35, 65];
/** Parcela máxima de torcidas no extremo (0 ou 100) ao fim de uma temporada. */
const MAX_EXTREME_SHARE = 0.1;

interface SeasonEnd {
  mean: number;
  extreme: number;
  clubs: number;
}

function simulate(careerSeed: string): SeasonEnd[] {
  const base = testWorld();
  const created = createLeagueSeason(base, { competitionId: competitionId(), careerSeed });
  if (!created.ok) throw new Error("falhou");
  let world: CompletedBank = ensureContracts(base, created.league.year, careerSeed);
  let league: LeagueSeason = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal: RenewalState = initialRenewal(world);
  let market: MarketState = emptyMarket();
  let board: BoardState = createBoard(world, league, finances, careerSeed);
  let fans: FansState = createFans(world, league);
  let history: SeasonHistoryEntry[] = [];
  const ends: SeasonEnd[] = [];
  for (let index = 0; index < SEASONS; index++) {
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      "",
      undefined,
      { state: renewal, careerSeed },
      { state: market, careerSeed },
      { state: board, careerSeed },
      { state: fans },
    );
    if (!played.ok || !played.fans) throw new Error(JSON.stringify(played));
    const moods = Object.values(played.fans.clubs).map((club) => club.mood);
    ends.push({
      mean: moods.reduce((sum, mood) => sum + mood, 0) / moods.length,
      extreme: moods.filter((mood) => mood === 0 || mood === 100).length,
      clubs: moods.length,
    });
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed,
      finances: played.finances,
      managerClubId: "",
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
      board: played.board ?? board,
      fans: played.fans,
    });
    if (!turned.ok || !turned.finances || !turned.fans) throw new Error(JSON.stringify(turned));
    ({ league, history, world } = turned);
    finances = turned.finances;
    renewal = turned.renewal ?? renewal;
    market = turned.market ?? market;
    board = turned.board ?? board;
    fans = turned.fans;
  }
  return ends;
}

describe("torcidas em 30 temporadas (SC-005, research.md R12)", () => {
  const runs: SeasonEnd[][] = [];
  beforeAll(() => {
    for (const seed of ["torcida-longa-1", "torcida-longa-2"]) runs.push(simulate(seed));
  }, 600_000);

  it("humor médio entre 35 e 65 em toda temporada", () => {
    for (const ends of runs) {
      console.log("humor médio:", ends.map((end) => end.mean.toFixed(0)).join(" "));
      for (const end of ends) {
        expect(end.mean).toBeGreaterThanOrEqual(MEAN_MOOD[0]);
        expect(end.mean).toBeLessThanOrEqual(MEAN_MOOD[1]);
      }
    }
  });

  it("poucas torcidas presas nos extremos", () => {
    for (const ends of runs) {
      for (const end of ends)
        expect(end.extreme / end.clubs).toBeLessThanOrEqual(MAX_EXTREME_SHARE);
    }
  });
});
