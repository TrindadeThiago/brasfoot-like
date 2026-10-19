import { describe, expect, it } from "vitest";
import { clubDivision } from "../../src/career/league";
import { deriveWage } from "../../src/derived/economy";
import { annualWageBill, createFinances, sponsorshipFor } from "../../src/finance/create";
import { DEFAULT_ECONOMY, divisionEconomy, economyRules } from "../../src/finance/rules";
import { competitionId, newLeague, testWorld } from "../career/helpers";

describe("finanças iniciais (FR-001, FR-011, FR-016)", () => {
  const league = newLeague("financas");
  const finances = createFinances(testWorld(), league);
  const rules = economyRules(testWorld(), competitionId());

  it("um registro por clube, com caixa inicial + patrocínio, preço padrão e estádio do banco", () => {
    const clubs = league.divisions.flatMap((season) => season.clubIds);
    expect(Object.keys(finances.clubs).sort()).toEqual([...clubs].sort());
    for (const clubId of clubs) {
      const club = testWorld().clubs.find((entry) => entry.id === clubId);
      if (!club) throw new Error("sem clube");
      const level = clubDivision(league, clubId)?.divisionLevel ?? 0;
      const division = divisionEconomy(rules, level);
      const wages = annualWageBill(testWorld(), clubId, testWorld().manifest.referenceDate);
      const sponsorship =
        division.sponsorship.base +
        division.sponsorship.perReputation * club.reputation +
        Math.round((wages * division.sponsorship.wageSharePct) / 100);
      const finance = finances.clubs[clubId];
      expect(finance).toMatchObject({
        clubId,
        cash: club.initialCash + sponsorship,
        seasonStartCash: club.initialCash,
        debt: 0,
        capacity: club.stadiumCapacity,
        negativeRounds: 0,
        inCrisis: false,
      });
      expect(finance?.works).toBeUndefined();
      expect(finance?.ticketPrice).toBe(
        Math.round((division.referencePrice * (80 + (40 * club.reputation) / 100)) / 100),
      );
      expect(sponsorshipFor(rules, level, club.reputation, wages)).toBe(sponsorship);
    }
  });

  it("lança o patrocínio da temporada na rodada 0", () => {
    expect(finances.ledger).toHaveLength(40);
    for (const entry of finances.ledger) {
      expect(entry).toMatchObject({ season: 1, round: 0, category: "sponsorship" });
      expect(entry.amount).toBeGreaterThan(0);
    }
    expect(finances.gates).toEqual([]);
    expect(finances.seasons).toEqual([]);
    expect(finances.crises).toEqual([]);
  });

  it("o preço padrão fica na faixa permitida", () => {
    for (const finance of Object.values(finances.clubs)) {
      expect(finance.ticketPrice).toBeGreaterThanOrEqual(DEFAULT_ECONOMY.priceRange.min);
      expect(finance.ticketPrice).toBeLessThanOrEqual(DEFAULT_ECONOMY.priceRange.max);
    }
  });

  it("folha anual = 12 salários de cada jogador", () => {
    const club = testWorld().clubs[0];
    if (!club) throw new Error("sem clube");
    const reference = testWorld().manifest.referenceDate;
    const monthly = testWorld()
      .players.filter((player) => player.clubId === club.id)
      .reduce((sum, player) => sum + deriveWage(player, club, reference), 0);
    expect(annualWageBill(testWorld(), club.id, reference)).toBe(12 * monthly);
  });

  it("é determinística", () => {
    expect(createFinances(testWorld(), league)).toEqual(finances);
  });
});
