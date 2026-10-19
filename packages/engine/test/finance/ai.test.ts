import { describe, expect, it } from "vitest";
import { creditLine } from "../../src/finance/actions";
import { aiRoundReview } from "../../src/finance/ai";
import { annualWageBill } from "../../src/finance/create";
import { economyRules } from "../../src/finance/rules";
import type { FinanceState, GateRecord } from "../../src/finance/types";
import { competitionId } from "../career/helpers";
import { career, testWorld } from "./helpers";

const MANAGER = "clube-001";
const AI = "clube-002";
const { league, finances } = career("ia-financas");
const rules = economyRules(testWorld(), competitionId());
const annual = annualWageBill(testWorld(), AI, testWorld().manifest.referenceDate);

function homeGames(state: FinanceState, clubId: string, occupancy: number): FinanceState {
  const copy = structuredClone(state);
  const capacity = copy.clubs[clubId]?.capacity ?? 10_000;
  const games: GateRecord[] = [1, 2, 3].map((round) => ({
    season: 1,
    round,
    clubId,
    opponentId: "clube-003",
    attendance: Math.floor(capacity * occupancy),
    capacity,
    price: 10,
    revenue: Math.floor(capacity * occupancy) * 10,
  }));
  copy.gates.push(...games);
  return copy;
}

function withCash(state: FinanceState, clubId: string, cash: number, debt = 0): FinanceState {
  const copy = structuredClone(state);
  const club = copy.clubs[clubId];
  if (!club) throw new Error("sem clube");
  copy.ledger.push({ clubId, season: 1, round: 0, category: "prize", amount: cash - club.cash });
  club.cash = cash;
  club.debt = debt;
  return copy;
}

describe("decisões financeiras da IA (US7, FR-021)", () => {
  it("estádio lotado sobe o preço 10% na revisão; vazio baixa 10%", () => {
    const price = finances.clubs[AI]?.ticketPrice ?? 0;
    const full = aiRoundReview(homeGames(finances, AI, 1), league, testWorld(), 4, MANAGER);
    expect(full.clubs[AI]?.ticketPrice).toBe(
      Math.min(rules.priceRange.max, Math.max(price + 1, Math.round(price * 1.1))),
    );
    const empty = aiRoundReview(homeGames(finances, AI, 0.4), league, testWorld(), 4, MANAGER);
    expect(empty.clubs[AI]?.ticketPrice).toBe(
      Math.max(rules.priceRange.min, Math.min(price - 1, Math.round(price * 0.9))),
    );
    const notReview = aiRoundReview(homeGames(finances, AI, 1), league, testWorld(), 3, MANAGER);
    expect(notReview.clubs[AI]?.ticketPrice).toBe(price);
  });

  it("com caixa folgado e estádio cheio, contrata a maior obra que respeita a margem", () => {
    const margin = Math.floor(annual / 2);
    const cost = rules.stadium.options[1]?.cost ?? 0;
    const state = withCash(homeGames(finances, AI, 0.95), AI, cost + margin);
    const result = aiRoundReview(state, league, testWorld(), 4, MANAGER);
    expect(result.clubs[AI]?.works?.seats).toBe(rules.stadium.options[1]?.seats);
    const poor = withCash(
      homeGames(finances, AI, 0.95),
      AI,
      cost + margin - (rules.stadium.options[0]?.cost ?? 0) - 1,
    );
    expect(aiRoundReview(poor, league, testWorld(), 4, MANAGER).clubs[AI]?.works?.seats).not.toBe(
      rules.stadium.options[1]?.seats,
    );
  });

  it("caixa negativo toma o empréstimo para voltar a 1 mês de folha", () => {
    const state = withCash(finances, AI, -1_000_000);
    const result = aiRoundReview(state, league, testWorld(), 1, MANAGER);
    const needed = 1_000_000 + Math.floor(annual / 12);
    const { available } = creditLine(state, league, testWorld(), AI);
    expect(result.clubs[AI]?.debt).toBe(Math.min(needed, available));
    expect(result.clubs[AI]?.cash).toBe(-1_000_000 + Math.min(needed, available));
  });

  it("caixa acima de 6 meses de folha amortiza a dívida", () => {
    const margin = Math.floor(annual / 2);
    const state = withCash(finances, AI, margin + 300_000, 1_000_000);
    const result = aiRoundReview(state, league, testWorld(), 1, MANAGER);
    expect(result.clubs[AI]?.debt).toBe(700_000);
    expect(result.clubs[AI]?.cash).toBe(margin);
  });

  it("nunca mexe no clube do jogador e é determinística", () => {
    const state = withCash(homeGames(finances, MANAGER, 1), MANAGER, -5_000_000);
    const result = aiRoundReview(state, league, testWorld(), 4, MANAGER);
    expect(result.clubs[MANAGER]).toEqual(state.clubs[MANAGER]);
    expect(aiRoundReview(state, league, testWorld(), 4, MANAGER)).toEqual(result);
  });
});
