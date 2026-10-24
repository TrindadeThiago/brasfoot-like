import { boardAfterRound } from "../board/round";
import type { BoardState } from "../board/types";
import { seasonDate } from "../calendar/date";
import { leagueRound } from "../career/league";
import type { DayMatch } from "../career/season-state";
import type { LeagueSeason } from "../career/types";
import { fansAfterRound } from "../fans/mood";
import type { FansState } from "../fans/types";
import { neutralCapacityOf } from "../knockout/prizes";
import { closedWindow, closeWindowReport } from "../market/ai/report";
import { aiMarketRound } from "../market/ai/round";
import { marketAfterRound } from "../market/incoming";
import { releaseManagerClub } from "../market/release";
import type { MarketState } from "../market/types";
import type { CompletedBank } from "../model/types";
import { newsAfterRound } from "../news/round";
import type { NewsState } from "../news/types";
import { evolvePlayers, midSeasonRound } from "../renewal/evolution";
import type { RenewalState } from "../renewal/types";
import type { SeasonError } from "../season/errors";
import { interestFor } from "./actions";
import { aiRoundReview } from "./ai";
import { annualWageBill } from "./create";
import { gateFor } from "./gate";
import { draft, post, pushGate } from "./ledger";
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

/** Notícias da carreira passadas à rodada (014): manchetes, recordes e memória do mundo. */
export interface CareerNews {
  state: NewsState;
  careerSeed: string;
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
      news?: NewsState;
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
      pushGate(working, {
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

/**
 * Bilheteria dos jogos em casa de competições secundárias num dia (017 R7): o mesmo cálculo de
 * público e renda da liga principal, que fornece o contexto (divisão, fase recente, preços).
 * Folha, juros, obras e crise só andam nos dias da principal. Não altera a entrada.
 */
export function applyExtraGates(
  finances: FinanceState,
  principal: LeagueSeason,
  world: CompletedBank,
  matches: readonly DayMatch[],
  fans?: FansState,
): FinanceState {
  if (matches.length === 0) return finances;
  const rules = economyRules(world, principal.competitionId);
  const working = draft(finances);
  const round = leagueRound(principal);
  for (const match of matches) {
    const home = match.fixture.home;
    const price = working.clubs[home]?.ticketPrice ?? rules.priceRange.min;
    const mood = fans?.clubs[home]?.mood;
    const neutral = match.fixture.neutral === true && match.fixture.tie !== undefined;
    const gate = gateFor(working, principal, world, { ...match.fixture, round }, price, {
      ...(mood !== undefined ? { mood } : {}),
      ...(neutral && match.fixture.tie
        ? {
            capacity: neutralCapacityOf(
              world,
              match.competitionId,
              match.fixture.tie.phase,
              match.fixture.stage
                ? { stage: match.fixture.stage.index, divisionLevel: match.divisionLevel }
                : undefined,
            ),
          }
        : {}),
    });
    // Campo neutro: a renda é dividida entre os dois clubes (018 R12); o resto fica com o mandante.
    const shares = neutral
      ? [
          { clubId: home, revenue: Math.ceil(gate.revenue / 2), opponentId: match.fixture.away },
          {
            clubId: match.fixture.away,
            revenue: Math.floor(gate.revenue / 2),
            opponentId: home,
          },
        ]
      : [{ clubId: home, revenue: gate.revenue, opponentId: match.fixture.away }];
    for (const share of shares) {
      post(working, {
        clubId: share.clubId,
        season: principal.number,
        round: round - 1,
        category: "gate",
        amount: share.revenue,
        date: match.date,
        competitionId: match.competitionId,
      });
      pushGate(working, {
        season: principal.number,
        round: round - 1,
        clubId: share.clubId,
        opponentId: share.opponentId,
        ...gate,
        revenue: share.revenue,
        date: match.date,
        competitionId: match.competitionId,
      });
    }
  }
  return working;
}

/** Lança os prêmios da copa no caixa dos clubes (018 R12). Não altera a entrada. */
export function applyCupPrizes(
  finances: FinanceState,
  principal: LeagueSeason,
  prizes: readonly { clubId: string; amount: number; date: string; competitionId: string }[],
): FinanceState {
  if (prizes.length === 0) return finances;
  const working = draft(finances);
  const round = leagueRound(principal);
  for (const prize of prizes) {
    if (!working.clubs[prize.clubId]) continue;
    post(working, {
      clubId: prize.clubId,
      season: principal.number,
      round: round - 1,
      category: "prize",
      amount: prize.amount,
      date: prize.date,
      competitionId: prize.competitionId,
    });
  }
  return working;
}

/**
 * O que acontece depois que a rodada `round` da liga principal foi fechada (`league` já a
 * traz): finanças, evolução do meio da temporada, mercado, torcida, diretoria e notícias, nessa
 * ordem. É o caminho comum da rodada antiga e do dia de jogos da 017.
 */
export function applyRoundSystems(
  league: LeagueSeason,
  finances: FinanceState,
  world: CompletedBank,
  round: number,
  managerClubId: string,
  renewal?: CareerRenewal,
  market?: CareerMarket,
  board?: CareerBoard,
  fans?: CareerFans,
  news?: CareerNews,
  /** Outras competições da carreira: seus minutos contam na evolução (017 R9). */
  otherCompetitions: readonly LeagueSeason[] = [],
  /**
   * Liga de outro país que não o do técnico (020 R6): só decisões da IA. O mercado do jogador
   * (negociações, propostas recebidas e resumo de janela) e a última evolução mostrada a ele não
   * são tocados, e a diretoria só avalia os clubes da liga.
   */
  options: { foreign?: boolean } = {},
): CareerRoundResult {
  const foreign = options.foreign === true;
  // A bilheteria usa o humor de antes do jogo (013 R10).
  let nextFinances = applyRoundFinances(finances, league, world, round, managerClubId, fans?.state);
  let nextWorld = world;
  let nextRenewal = renewal?.state;
  if (renewal && round === midSeasonRound(league)) {
    // Evolução do meio da temporada (009 R3), no mesmo caminho do ao vivo e do direto.
    const evolved = evolvePlayers(
      world,
      league,
      renewal.careerSeed,
      "mid",
      1,
      round,
      otherCompetitions,
    );
    nextWorld = evolved.world;
    nextRenewal = foreign ? renewal.state : { ...renewal.state, lastEvolution: evolved.record };
  }
  let nextMarket = market?.state;
  if (market) {
    // Mercado (011 R1): decisões da IA, depois propostas ao humano e expirações da 010.
    const context = {
      world: nextWorld,
      league,
      finances: nextFinances,
      market: market.state,
      managerClubId,
      careerSeed: market.careerSeed,
    };
    const ai = aiMarketRound(context);
    const after = foreign
      ? { world: ai.world, finances: ai.finances, market: ai.market }
      : marketAfterRound({
          ...context,
          world: ai.world,
          finances: ai.finances,
          market: ai.market,
        });
    nextWorld = after.world;
    nextFinances = after.finances;
    nextMarket = after.market;
    const closed = foreign ? undefined : closedWindow(context);
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
        league,
        finances: nextFinances,
        fans: fans.state,
        ...(nextMarket ? { market: nextMarket } : {}),
      },
      round,
      managerClubId,
    );
  }
  let nextBoard = board?.state;
  if (board) {
    // Diretoria (012 R2): depois das finanças, do mercado e da torcida da rodada.
    const update = boardAfterRound(
      {
        world: nextWorld,
        league,
        finances: nextFinances,
        board: board.state,
        careerSeed: board.careerSeed,
        ...(nextFans ? { fans: nextFans } : {}),
        ...(foreign ? { foreign: true } : {}),
      },
      round,
    );
    nextBoard = update.board;
    if (update.managerReleased && nextMarket) {
      nextMarket = releaseManagerClub(
        {
          world: nextWorld,
          league,
          finances: nextFinances,
          market: nextMarket,
          managerClubId: update.managerReleased,
          careerSeed: board.careerSeed,
        },
        update.managerReleased,
      );
    }
  }
  let nextNews = news?.state;
  if (news) {
    // Notícias (014 R2): por último, com mercado, diretoria e torcida já atualizados.
    nextNews = newsAfterRound(
      {
        world: nextWorld,
        league,
        news: news.state,
        careerSeed: news.careerSeed,
        managerClubId: nextBoard ? (nextBoard.manager.clubId ?? "") : managerClubId,
        ...(nextMarket ? { market: nextMarket } : {}),
        ...(board ? { boardBefore: board.state } : {}),
        ...(nextBoard ? { boardAfter: nextBoard } : {}),
      },
      round,
    );
  }
  return {
    ok: true,
    league,
    finances: nextFinances,
    world: nextWorld,
    ...(nextRenewal ? { renewal: nextRenewal } : {}),
    ...(nextMarket ? { market: nextMarket } : {}),
    ...(nextBoard ? { board: nextBoard } : {}),
    ...(nextFans ? { fans: nextFans } : {}),
    ...(nextNews ? { news: nextNews } : {}),
  };
}
