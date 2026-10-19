import { clubDivision, leagueRound } from "../career/league";
import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { type FinanceError, financeError } from "./errors";
import { draft, post } from "./ledger";
import { divisionEconomy, economyRules } from "./rules";
import type { FinanceState, LedgerCategory } from "./types";

export type FinanceResult =
  | { ok: true; finances: FinanceState }
  | { ok: false; error: FinanceError };

function fail(error: FinanceError): FinanceResult {
  return { ok: false, error };
}

/** Rodada da liga já fechada (0 antes da primeira): onde ficam as ações entre rodadas. */
function closedRound(league: LeagueSeason): number {
  return leagueRound(league) - 1;
}

function entry(league: LeagueSeason, clubId: string, category: LedgerCategory, amount: number) {
  return { clubId, season: league.number, round: closedRound(league), category, amount };
}

function validAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0;
}

/** Preço do ingresso dos próximos jogos em casa, dentro da faixa do mod (FR-016). */
export function setTicketPrice(
  finances: FinanceState,
  world: CompletedBank,
  competitionId: string,
  clubId: string,
  price: number,
): FinanceResult {
  const { min, max } = economyRules(world, competitionId).priceRange;
  if (!Number.isInteger(price) || price < min || price > max) {
    return fail(financeError("finance.price_out_of_range", { price, min, max }));
  }
  const working = draft(finances);
  const club = working.clubs[clubId];
  if (!club) throw new Error(`clube sem finanças: ${clubId}`);
  club.ticketPrice = price;
  return { ok: true, finances: working };
}

/** Limite de crédito, disponível e juros por rodada (FR-013, FR-014). */
export function creditLine(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  clubId: string,
): { limit: number; available: number; interestBp: number; interestPerRound: number } {
  const rules = economyRules(world, league.competitionId);
  const reputation = world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
  const level = clubDivision(league, clubId)?.divisionLevel ?? 1;
  const limit = divisionEconomy(rules, level).creditBase + rules.credit.perReputation * reputation;
  const debt = finances.clubs[clubId]?.debt ?? 0;
  return {
    limit,
    available: Math.max(0, limit - debt),
    interestBp: rules.credit.interestBp,
    interestPerRound: interestFor(debt, rules.credit.interestBp),
  };
}

/** Juros de uma rodada sobre a dívida (R7), arredondados para cima. */
export function interestFor(debt: number, interestBp: number): number {
  return Math.ceil((debt * interestBp) / 10_000);
}

/** Toma um empréstimo até o crédito disponível (FR-015). */
export function takeLoan(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  clubId: string,
  amount: number,
): FinanceResult {
  if (!validAmount(amount)) return fail(financeError("finance.invalid_amount", { amount }));
  const { available } = creditLine(finances, league, world, clubId);
  if (amount > available) return fail(financeError("finance.credit_limit", { amount, available }));
  const working = draft(finances);
  const club = working.clubs[clubId];
  if (!club) throw new Error(`clube sem finanças: ${clubId}`);
  club.debt += amount;
  post(working, entry(league, clubId, "loan_in", amount));
  return { ok: true, finances: working };
}

/** Amortiza a dívida; valor acima da dívida é limitado a ela (FR-015). */
export function repayLoan(
  finances: FinanceState,
  league: LeagueSeason,
  clubId: string,
  amount: number,
): FinanceResult {
  if (!validAmount(amount)) return fail(financeError("finance.invalid_amount", { amount }));
  const current = finances.clubs[clubId];
  if (!current) throw new Error(`clube sem finanças: ${clubId}`);
  if (current.debt === 0) return fail(financeError("finance.no_debt"));
  const paid = Math.min(amount, current.debt);
  if (paid > current.cash) {
    return fail(financeError("finance.insufficient_cash", { amount: paid, cash: current.cash }));
  }
  const working = draft(finances);
  const club = working.clubs[clubId];
  if (!club) throw new Error(`clube sem finanças: ${clubId}`);
  club.debt -= paid;
  post(working, entry(league, clubId, "loan_out", -paid));
  return { ok: true, finances: working };
}

/** Contrata uma ampliação do estádio, paga à vista (FR-018). */
export function startStadiumWorks(
  finances: FinanceState,
  league: LeagueSeason,
  world: CompletedBank,
  clubId: string,
  optionIndex: number,
): FinanceResult {
  const rules = economyRules(world, league.competitionId);
  const current = finances.clubs[clubId];
  if (!current) throw new Error(`clube sem finanças: ${clubId}`);
  if (current.works) {
    return fail(
      financeError("finance.works_in_progress", { remainingRounds: current.works.remainingRounds }),
    );
  }
  const option = rules.stadium.options[optionIndex];
  if (!option) return fail(financeError("finance.unknown_option", { index: optionIndex }));
  if (current.capacity + option.seats > rules.stadium.maxCapacity) {
    return fail(
      financeError("finance.max_capacity", {
        capacity: current.capacity,
        max: rules.stadium.maxCapacity,
      }),
    );
  }
  if (option.cost > current.cash) {
    return fail(
      financeError("finance.insufficient_cash", { amount: option.cost, cash: current.cash }),
    );
  }
  const working = draft(finances);
  const club = working.clubs[clubId];
  if (!club) throw new Error(`clube sem finanças: ${clubId}`);
  club.works = { seats: option.seats, cost: option.cost, remainingRounds: option.rounds };
  post(working, entry(league, clubId, "stadium", -option.cost));
  return { ok: true, finances: working };
}
