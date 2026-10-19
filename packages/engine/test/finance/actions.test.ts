import { describe, expect, it } from "vitest";
import { clubDivision } from "../../src/career/league";
import {
  creditLine,
  repayLoan,
  setTicketPrice,
  startStadiumWorks,
  takeLoan,
} from "../../src/finance/actions";
import { createFinances } from "../../src/finance/create";
import { divisionEconomy, economyRules } from "../../src/finance/rules";
import type { FinanceState } from "../../src/finance/types";
import { competitionId, newLeague, testWorld } from "../career/helpers";

const league = newLeague("acoes");
const base = createFinances(testWorld(), league);
const rules = economyRules(testWorld(), competitionId());
const clubId = league.divisions[0]?.clubIds[0] as string;

function ok(result: { ok: true; finances: FinanceState } | { ok: false; error: unknown }) {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.finances;
}

function withCash(finances: FinanceState, cash: number): FinanceState {
  const copy = structuredClone(finances);
  const club = copy.clubs[clubId];
  if (club) {
    copy.ledger.push({ clubId, season: 1, round: 0, category: "prize", amount: cash - club.cash });
    club.cash = cash;
  }
  return copy;
}

describe("ações financeiras (FR-013 a FR-019)", () => {
  it("preço do ingresso dentro da faixa; fora dela é recusado", () => {
    const changed = ok(setTicketPrice(base, testWorld(), competitionId(), clubId, 40));
    expect(changed.clubs[clubId]?.ticketPrice).toBe(40);
    expect(base.clubs[clubId]?.ticketPrice).not.toBe(40);
    for (const price of [rules.priceRange.min - 1, rules.priceRange.max + 1]) {
      const result = setTicketPrice(base, testWorld(), competitionId(), clubId, price);
      expect(result).toEqual({
        ok: false,
        error: {
          code: "finance.price_out_of_range",
          params: { price, min: rules.priceRange.min, max: rules.priceRange.max },
        },
      });
    }
    expect(setTicketPrice(base, testWorld(), competitionId(), clubId, 12.5).ok).toBe(false);
  });

  it("linha de crédito: limite, disponível e juros por rodada", () => {
    const club = testWorld().clubs.find((entry) => entry.id === clubId);
    const level = clubDivision(league, clubId)?.divisionLevel ?? 1;
    const limit =
      divisionEconomy(rules, level).creditBase +
      rules.credit.perReputation * (club?.reputation ?? 0);
    expect(creditLine(base, league, testWorld(), clubId)).toEqual({
      limit,
      available: limit,
      interestBp: rules.credit.interestBp,
      interestPerRound: 0,
    });
    const indebted = ok(takeLoan(base, league, testWorld(), clubId, 1_000_000));
    expect(creditLine(indebted, league, testWorld(), clubId)).toMatchObject({
      available: limit - 1_000_000,
      interestPerRound: Math.ceil((1_000_000 * rules.credit.interestBp) / 10_000),
    });
  });

  it("tomar empréstimo aumenta caixa e dívida; acima do disponível é recusado", () => {
    const before = base.clubs[clubId];
    const after = ok(takeLoan(base, league, testWorld(), clubId, 500_000));
    expect(after.clubs[clubId]?.cash).toBe((before?.cash ?? 0) + 500_000);
    expect(after.clubs[clubId]?.debt).toBe(500_000);
    expect(after.ledger.at(-1)).toMatchObject({ clubId, category: "loan_in", amount: 500_000 });
    const { available } = creditLine(base, league, testWorld(), clubId);
    expect(takeLoan(base, league, testWorld(), clubId, available + 1)).toEqual({
      ok: false,
      error: { code: "finance.credit_limit", params: { amount: available + 1, available } },
    });
    for (const amount of [0, -5, 10.5]) {
      expect(takeLoan(base, league, testWorld(), clubId, amount)).toEqual({
        ok: false,
        error: { code: "finance.invalid_amount", params: { amount } },
      });
    }
  });

  it("amortizar reduz caixa e dívida, limitado à dívida e ao caixa", () => {
    const indebted = ok(takeLoan(base, league, testWorld(), clubId, 800_000));
    const partial = ok(repayLoan(indebted, league, clubId, 300_000));
    expect(partial.clubs[clubId]?.debt).toBe(500_000);
    expect(partial.ledger.at(-1)).toMatchObject({ category: "loan_out", amount: -300_000 });
    const settled = ok(repayLoan(partial, league, clubId, 9_000_000));
    expect(settled.clubs[clubId]?.debt).toBe(0);
    expect(settled.ledger.at(-1)).toMatchObject({ amount: -500_000 });
    expect(repayLoan(base, league, clubId, 1000)).toEqual({
      ok: false,
      error: { code: "finance.no_debt", params: {} },
    });
    const broke = withCash(indebted, 100);
    expect(repayLoan(broke, league, clubId, 1000)).toEqual({
      ok: false,
      error: { code: "finance.insufficient_cash", params: { amount: 1000, cash: 100 } },
    });
  });

  it("obra: cobra à vista, uma por vez, respeita o máximo e o caixa", () => {
    const rich = withCash(base, 50_000_000);
    const option = rules.stadium.options[1];
    if (!option) throw new Error("sem opção");
    const started = ok(startStadiumWorks(rich, league, testWorld(), clubId, 1));
    expect(started.clubs[clubId]?.works).toEqual({
      seats: option.seats,
      cost: option.cost,
      remainingRounds: option.rounds,
    });
    expect(started.clubs[clubId]?.cash).toBe(50_000_000 - option.cost);
    expect(started.clubs[clubId]?.capacity).toBe(rich.clubs[clubId]?.capacity);
    expect(started.ledger.at(-1)).toMatchObject({ category: "stadium", amount: -option.cost });
    expect(startStadiumWorks(started, league, testWorld(), clubId, 0)).toEqual({
      ok: false,
      error: { code: "finance.works_in_progress", params: { remainingRounds: option.rounds } },
    });
    expect(startStadiumWorks(rich, league, testWorld(), clubId, 9)).toEqual({
      ok: false,
      error: { code: "finance.unknown_option", params: { index: 9 } },
    });
    const full = structuredClone(rich);
    const club = full.clubs[clubId];
    if (club) club.capacity = rules.stadium.maxCapacity - 1000;
    expect(startStadiumWorks(full, league, testWorld(), clubId, 0)).toEqual({
      ok: false,
      error: {
        code: "finance.max_capacity",
        params: { capacity: rules.stadium.maxCapacity - 1000, max: rules.stadium.maxCapacity },
      },
    });
    const poor = withCash(base, 1000);
    expect(startStadiumWorks(poor, league, testWorld(), clubId, 0)).toEqual({
      ok: false,
      error: {
        code: "finance.insufficient_cash",
        params: { amount: rules.stadium.options[0]?.cost ?? 0, cash: 1000 },
      },
    });
  });

  it("nunca altera a entrada", () => {
    const snapshot = JSON.stringify(base);
    takeLoan(base, league, testWorld(), clubId, 100_000);
    setTicketPrice(base, testWorld(), competitionId(), clubId, 30);
    startStadiumWorks(withCash(base, 50_000_000), league, testWorld(), clubId, 0);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
