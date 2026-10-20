import { managerClubOf } from "../board/create";
import { boardAfterRound } from "../board/round";
import type { BoardState } from "../board/types";
import { seasonDate } from "../calendar/date";
import { completeLeagueRound, startLeagueRound } from "../career/league-round";
import type { LeagueSeason } from "../career/types";
import { fansAfterRound } from "../fans/mood";
import type { FansState } from "../fans/types";
import { closedWindow, closeWindowReport } from "../market/ai/report";
import { aiMarketRound } from "../market/ai/round";
import { marketAfterRound } from "../market/incoming";
import { releaseManagerClub } from "../market/release";
import type { MarketState } from "../market/types";
import type { Lineup } from "../match/types";
import type { CompletedBank } from "../model/types";
import { evolvePlayers, midSeasonRound } from "../renewal/evolution";
import type { RenewalState } from "../renewal/types";
import type { SeasonError } from "../season/errors";
import { finishRound, type LiveRound } from "../season/live-round";
import { isSeasonOver } from "../season/season";
import type { SeasonStep } from "../season/types";
import { interestFor } from "./actions";
import { aiRoundReview } from "./ai";
import { annualWageBill } from "./create";
import { gateFor } from "./gate";
import { draft, post } from "./ledger";
import { economyRules } from "./rules";
import type { FinanceState } from "./types";

/** Estado de renovação da carreira passado à rodada (009): evolução do meio da temporada. */
export interface CareerRenewal {
  state: RenewalState;
  careerSeed: string;
}

/** Mercado da carreira passado à rodada (011): IA de mercado, propostas e expirações. */
export interface CareerMarket {
  state: MarketState;
  careerSeed: string;
}

/** Diretoria da carreira passada à rodada (012): confiança, demissões, vagas e propostas. */
export interface CareerBoard {
  state: BoardState;
  careerSeed: string;
}

/** Torcidas da carreira passadas à rodada (013): humor, público e pressão na diretoria. */
export interface CareerFans {
  state: FansState;
}

export type CareerRoundResult =
  | {
      ok: true;
      league: LeagueSeason;
      finances: FinanceState;
      /** Mundo vivo depois da rodada (muda na evolução do meio da temporada e no mercado). */
      world: CompletedBank;
      renewal?: RenewalState;
      market?: MarketState;
      board?: BoardState;
      fans?: FansState;
    }
  | { ok: false; error: SeasonError };

/** Parcela da folha na rodada `k` de `total`: as parcelas somam exatamente a folha anual (R4). */
function wageInstalment(annual: number, round: number, total: number): number {
  return Math.floor((annual * round) / total) - Math.floor((annual * (round - 1)) / total);
}

/**
 * Movimentação de uma rodada já fechada na liga (data-model.md), em ordem fixa e com clubes por
 * id: bilheteria, folha, juros, obras, crise e decisões da IA. Não altera a entrada.
 */
export function applyRoundFinances(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  round: number,
  managerClubId: string,
  fans?: FansState,
): FinanceState {
  const rules = economyRules(world, league.competitionId);
  const working = draft(finances);
  const entry = (clubId: string, category: "gate" | "wages" | "interest", amount: number) => ({
    clubId,
    season: league.number,
    round,
    category,
    amount,
  });

  const playing = league.divisions.filter((season) => round <= season.calendar.length);
  for (const season of playing) {
    for (const fixture of season.calendar[round - 1]?.fixtures ?? []) {
      const price = working.clubs[fixture.home]?.ticketPrice ?? rules.priceRange.min;
      const mood = fans?.clubs[fixture.home]?.mood;
      const gate = gateFor(
        working,
        league,
        world,
        fixture,
        price,
        mood !== undefined ? { mood } : {},
      );
      post(working, entry(fixture.home, "gate", gate.revenue));
      working.gates.push({
        season: league.number,
        round,
        clubId: fixture.home,
        opponentId: fixture.away,
        ...gate,
      });
    }
  }

  const date = seasonDate(world.manifest.referenceDate, league.year);
  for (const season of playing) {
    for (const clubId of [...season.clubIds].sort()) {
      const annual = annualWageBill(world, clubId, date);
      post(working, entry(clubId, "wages", -wageInstalment(annual, round, season.calendar.length)));
    }
  }

  const ids = Object.keys(working.clubs).sort();
  for (const clubId of ids) {
    const club = working.clubs[clubId];
    if (club && club.debt > 0) {
      post(working, entry(clubId, "interest", -interestFor(club.debt, rules.credit.interestBp)));
    }
  }

  for (const clubId of ids) {
    const club = working.clubs[clubId];
    if (!club?.works) continue;
    club.works.remainingRounds -= 1;
    if (club.works.remainingRounds <= 0) {
      club.capacity = Math.min(rules.stadium.maxCapacity, club.capacity + club.works.seats);
      delete club.works;
    }
  }

  for (const clubId of ids) {
    const club = working.clubs[clubId];
    if (!club) continue;
    if (club.cash < 0) {
      club.negativeRounds += 1;
      if (!club.inCrisis && club.negativeRounds >= rules.crisisRounds) {
        club.inCrisis = true;
        working.crises.push({ clubId, startSeason: league.number, startRound: round });
      }
    } else {
      club.negativeRounds = 0;
      if (club.inCrisis) {
        club.inCrisis = false;
        const open = [...working.crises]
          .reverse()
          .find((crisis) => crisis.clubId === clubId && crisis.endSeason === undefined);
        if (open) {
          open.endSeason = league.number;
          open.endRound = round;
        }
      }
    }
  }

  return aiRoundReview(working, league, world, round, managerClubId);
}

/** Fecha a rodada da liga e aplica as finanças, num passo (ao vivo e direto usam este caminho). */
export function completeCareerRound(
  league: LeagueSeason,
  finances: FinanceState,
  world: CompletedBank,
  round: LiveRound,
  managerClubId: string,
  renewal?: CareerRenewal,
  market?: CareerMarket,
  board?: CareerBoard,
  fans?: CareerFans,
): CareerRoundResult {
  const completed = completeLeagueRound(league, world, round);
  if (!completed.ok) return completed;
  // A bilheteria usa o humor de antes do jogo (013 R10).
  let nextFinances = applyRoundFinances(
    finances,
    completed.league,
    world,
    round.round,
    managerClubId,
    fans?.state,
  );
  let nextWorld = world;
  let nextRenewal = renewal?.state;
  if (renewal && round.round === midSeasonRound(completed.league)) {
    // Evolução do meio da temporada (009 R3), no mesmo caminho do ao vivo e do direto.
    const evolved = evolvePlayers(
      world,
      completed.league,
      renewal.careerSeed,
      "mid",
      1,
      round.round,
    );
    nextWorld = evolved.world;
    nextRenewal = { ...renewal.state, lastEvolution: evolved.record };
  }
  let nextMarket = market?.state;
  if (market) {
    // Mercado (011 R1): decisões da IA, depois propostas ao humano e expirações da 010.
    const context = {
      world: nextWorld,
      league: completed.league,
      finances: nextFinances,
      market: market.state,
      managerClubId,
      careerSeed: market.careerSeed,
    };
    const ai = aiMarketRound(context);
    const after = marketAfterRound({
      ...context,
      world: ai.world,
      finances: ai.finances,
      market: ai.market,
    });
    nextWorld = after.world;
    nextFinances = after.finances;
    nextMarket = after.market;
    const closed = closedWindow(context);
    if (closed !== undefined) {
      nextMarket = closeWindowReport({ ...context, world: nextWorld, market: nextMarket }, closed);
    }
  }
  let nextFans = fans?.state;
  if (fans) {
    // Torcida (013 R10): resultado, expectativa e ídolos (log do mercado da rodada).
    nextFans = fansAfterRound(
      {
        world: nextWorld,
        league: completed.league,
        finances: nextFinances,
        fans: fans.state,
        ...(nextMarket ? { market: nextMarket } : {}),
      },
      round.round,
      managerClubId,
    );
  }
  let nextBoard = board?.state;
  if (board) {
    // Diretoria (012 R2): depois das finanças, do mercado e da torcida da rodada.
    const update = boardAfterRound(
      {
        world: nextWorld,
        league: completed.league,
        finances: nextFinances,
        board: board.state,
        careerSeed: board.careerSeed,
        ...(nextFans ? { fans: nextFans } : {}),
      },
      round.round,
    );
    nextBoard = update.board;
    if (update.managerReleased && nextMarket) {
      nextMarket = releaseManagerClub(
        {
          world: nextWorld,
          league: completed.league,
          finances: nextFinances,
          market: nextMarket,
          managerClubId: update.managerReleased,
          careerSeed: board.careerSeed,
        },
        update.managerReleased,
      );
    }
  }
  return {
    ok: true,
    league: completed.league,
    finances: nextFinances,
    world: nextWorld,
    ...(nextRenewal ? { renewal: nextRenewal } : {}),
    ...(nextMarket ? { market: nextMarket } : {}),
    ...(nextBoard ? { board: nextBoard } : {}),
    ...(nextFans ? { fans: nextFans } : {}),
  };
}

/** Equivalente de advanceLeague com finanças (simulações e testes). */
export function advanceCareer(
  league: LeagueSeason,
  finances: FinanceState,
  world: CompletedBank,
  step: SeasonStep,
  managerClubId: string,
  lineups?: Record<string, Lineup>,
  renewal?: CareerRenewal,
  market?: CareerMarket,
  board?: CareerBoard,
  fans?: CareerFans,
): CareerRoundResult {
  let next: {
    league: LeagueSeason;
    finances: FinanceState;
    world: CompletedBank;
    renewal?: RenewalState;
    market?: MarketState;
    board?: BoardState;
    fans?: FansState;
  } = {
    league,
    finances,
    world,
    ...(renewal ? { renewal: renewal.state } : {}),
    ...(market ? { market: market.state } : {}),
    ...(board ? { board: board.state } : {}),
    ...(fans ? { fans: fans.state } : {}),
  };
  const total =
    "toEnd" in step
      ? Math.max(...league.divisions.map((season) => season.calendar.length))
      : step.rounds;
  for (let played = 0; played < total; played++) {
    if (next.league.divisions.every(isSeasonOver)) break;
    const started = startLeagueRound(next.league, next.world, played === 0 ? lineups : undefined);
    if (!started.ok) return started;
    const completed = completeCareerRound(
      next.league,
      next.finances,
      next.world,
      finishRound(started.round),
      // Com diretoria, o clube do técnico pode mudar no meio do avanço (demissão).
      next.board ? managerClubOf(next.board) : managerClubId,
      renewal && next.renewal ? { state: next.renewal, careerSeed: renewal.careerSeed } : undefined,
      market && next.market ? { state: next.market, careerSeed: market.careerSeed } : undefined,
      board && next.board ? { state: next.board, careerSeed: board.careerSeed } : undefined,
      fans && next.fans ? { state: next.fans } : undefined,
    );
    if (!completed.ok) return completed;
    next = {
      league: completed.league,
      finances: completed.finances,
      world: completed.world,
      ...(completed.renewal ? { renewal: completed.renewal } : {}),
      ...(completed.market ? { market: completed.market } : {}),
      ...(completed.board ? { board: completed.board } : {}),
      ...(completed.fans ? { fans: completed.fans } : {}),
    };
  }
  return { ok: true, ...next };
}
