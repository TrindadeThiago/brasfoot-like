import { seasonDate } from "../calendar/date";
import { completeLeagueRound, startLeagueRound } from "../career/league-round";
import type { LeagueSeason } from "../career/types";
import type { Lineup } from "../match/types";
import type { CompletedBank } from "../model/types";
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

export type CareerRoundResult =
  | { ok: true; league: LeagueSeason; finances: FinanceState }
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
      const gate = gateFor(working, league, world, fixture, price);
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
): CareerRoundResult {
  const completed = completeLeagueRound(league, world, round);
  if (!completed.ok) return completed;
  return {
    ok: true,
    league: completed.league,
    finances: applyRoundFinances(finances, completed.league, world, round.round, managerClubId),
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
): CareerRoundResult {
  let next = { league, finances };
  const total =
    "toEnd" in step
      ? Math.max(...league.divisions.map((season) => season.calendar.length))
      : step.rounds;
  for (let played = 0; played < total; played++) {
    if (next.league.divisions.every(isSeasonOver)) break;
    const started = startLeagueRound(next.league, world, played === 0 ? lineups : undefined);
    if (!started.ok) return started;
    const completed = completeCareerRound(
      next.league,
      next.finances,
      world,
      finishRound(started.round),
      managerClubId,
    );
    if (!completed.ok) return completed;
    next = { league: completed.league, finances: completed.finances };
  }
  return { ok: true, ...next };
}
