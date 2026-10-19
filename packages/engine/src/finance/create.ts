import { seasonDate } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import { deriveWage } from "../derived/economy";
import type { CompletedBank } from "../model/types";
import { draft, post } from "./ledger";
import { divisionEconomy, economyRules } from "./rules";
import type { ClubFinance, EconomyRules, FinanceState } from "./types";

/**
 * Patrocínio anual de um clube numa divisão (FR-011): parte fixa, parte pela reputação e parte
 * proporcional à folha (patrocinador paga mais por elenco mais caro; research.md R6).
 */
export function sponsorshipFor(
  rules: EconomyRules,
  level: number,
  reputation: number,
  annualWages: number,
): number {
  const { base, perReputation, wageSharePct } = divisionEconomy(rules, level).sponsorship;
  return base + perReputation * reputation + Math.round((annualWages * wageSharePct) / 100);
}

/** Preço padrão do ingresso de um clube (R7), dentro da faixa. */
export function defaultTicketPrice(rules: EconomyRules, level: number, reputation: number): number {
  const price = Math.round(
    (divisionEconomy(rules, level).referencePrice * (80 + (40 * reputation) / 100)) / 100,
  );
  return Math.min(rules.priceRange.max, Math.max(rules.priceRange.min, price));
}

function competitionOf(world: CompletedBank, clubId: string): string {
  const competition = world.competitions.find((entry) =>
    entry.divisions.some((division) => division.clubIds.includes(clubId)),
  );
  return competition?.id ?? world.competitions[0]?.id ?? "";
}

/** Folha anual do clube: 12 × Σ salários mensais × wageFactorPct (R4). */
export function annualWageBill(
  world: CompletedBank,
  clubId: string,
  referenceDate: string,
): number {
  const club = world.clubs.find((entry) => entry.id === clubId);
  if (!club) throw new Error(`clube inexistente: ${clubId}`);
  const rules = economyRules(world, competitionOf(world, clubId));
  const monthly = world.players
    .filter((player) => player.clubId === clubId)
    .reduce((sum, player) => sum + deriveWage(player, club, referenceDate), 0);
  return Math.round((12 * monthly * rules.wageFactorPct) / 100);
}

/**
 * Finanças iniciais da carreira (contracts/finance-api.md): caixa do banco, preço padrão, estádio do
 * banco, sem dívida, obra ou crise; lança o patrocínio da temporada atual (rodada 0).
 */
export function createFinances(world: CompletedBank, league: LeagueSeason): FinanceState {
  const rules = economyRules(world, league.competitionId);
  const clubs: Record<string, ClubFinance> = {};
  const levels = new Map<string, number>();
  for (const season of league.divisions) {
    for (const clubId of season.clubIds) levels.set(clubId, season.divisionLevel);
  }
  const ids = [...levels.keys()].sort();
  for (const clubId of ids) {
    const club = world.clubs.find((entry) => entry.id === clubId);
    if (!club) throw new Error(`clube inexistente: ${clubId}`);
    clubs[clubId] = {
      clubId,
      cash: club.initialCash,
      debt: 0,
      ticketPrice: defaultTicketPrice(rules, levels.get(clubId) ?? 1, club.reputation),
      capacity: Math.min(club.stadiumCapacity, rules.stadium.maxCapacity),
      negativeRounds: 0,
      inCrisis: false,
      seasonStartCash: club.initialCash,
    };
  }
  const working = draft({ clubs, ledger: [], gates: [], seasons: [], crises: [] });
  for (const clubId of ids) {
    const reputation = world.clubs.find((entry) => entry.id === clubId)?.reputation ?? 0;
    const wages = annualWageBill(
      world,
      clubId,
      seasonDate(world.manifest.referenceDate, league.year),
    );
    post(working, {
      clubId,
      season: league.number,
      round: 0,
      category: "sponsorship",
      amount: sponsorshipFor(rules, levels.get(clubId) ?? 1, reputation, wages),
    });
  }
  return working;
}
