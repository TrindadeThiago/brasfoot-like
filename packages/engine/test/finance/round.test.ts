import { describe, expect, it } from "vitest";
import { leagueRound } from "../../src/career/league";
import { startLeagueRound } from "../../src/career/league-round";
import { annualWageBill } from "../../src/finance/create";
import { advanceCareer, completeCareerRound } from "../../src/finance/round";
import { economyRules } from "../../src/finance/rules";
import type { FinanceState } from "../../src/finance/types";
import { managerAutoLineup } from "../../src/lineup/auto";
import { advanceRound, applyRoundChange, finishRound, matchOf } from "../../src/season/live-round";
import { competitionId } from "../career/helpers";
import { career, testWorld } from "./helpers";

const MANAGER = "clube-001";

function totalCash(finances: FinanceState): number {
  return Object.values(finances.clubs).reduce((sum, club) => sum + club.cash, 0);
}

describe("movimentação por rodada (US1, FR-002 a FR-010)", () => {
  const start = career("rodada-financas");

  it("mandantes recebem a bilheteria, todos pagam a folha, e o dinheiro é conservado", () => {
    const result = advanceCareer(start.league, start.finances, testWorld(), { rounds: 1 }, MANAGER);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const { finances } = result;
    const entries = finances.ledger.slice(start.finances.ledger.length);
    const fixtures = start.league.divisions.flatMap((season) => season.calendar[0]?.fixtures ?? []);
    expect(finances.gates).toHaveLength(fixtures.length);
    for (const fixture of fixtures) {
      const gate = entries.filter(
        (entry) => entry.clubId === fixture.home && entry.category === "gate",
      );
      expect(gate).toHaveLength(1);
      expect(
        entries.filter((entry) => entry.clubId === fixture.away && entry.category === "gate"),
      ).toEqual([]);
      const record = finances.gates.find((item) => item.clubId === fixture.home);
      expect(record).toMatchObject({
        round: 1,
        opponentId: fixture.away,
        revenue: gate[0]?.amount,
      });
      expect(record?.attendance).toBeLessThanOrEqual(record?.capacity ?? 0);
    }
    for (const clubId of Object.keys(finances.clubs)) {
      expect(
        entries.filter((entry) => entry.clubId === clubId && entry.category === "wages"),
      ).toHaveLength(1);
    }
    const sum = entries.reduce((total, entry) => total + entry.amount, 0);
    expect(totalCash(finances) - totalCash(start.finances)).toBe(sum);
  }, 30000);

  it("a folha da temporada inteira soma exatamente 12 salários", () => {
    const result = advanceCareer(
      start.league,
      start.finances,
      testWorld(),
      { toEnd: true },
      MANAGER,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const reference = testWorld().manifest.referenceDate;
    for (const clubId of Object.keys(result.finances.clubs)) {
      const paid = result.finances.ledger
        .filter((entry) => entry.clubId === clubId && entry.category === "wages")
        .reduce((total, entry) => total - entry.amount, 0);
      expect(paid).toBe(annualWageBill(testWorld(), clubId, reference));
    }
    const sum = result.finances.ledger.reduce((total, entry) => total + entry.amount, 0);
    const initial = Object.values(start.finances.clubs).reduce(
      (total, club) => total + club.seasonStartCash,
      0,
    );
    expect(totalCash(result.finances)).toBe(initial + sum);
  }, 60000);

  it("clube endividado paga juros por rodada", () => {
    const indebted = structuredClone(start.finances);
    const club = indebted.clubs[MANAGER];
    if (!club) throw new Error("sem clube");
    club.debt = 1_000_000;
    const rate = economyRules(testWorld(), competitionId()).credit.interestBp;
    const result = advanceCareer(start.league, indebted, testWorld(), { rounds: 1 }, MANAGER);
    if (!result.ok) throw new Error("falhou");
    const interest = result.finances.ledger.filter(
      (entry) => entry.clubId === MANAGER && entry.category === "interest",
    );
    expect(interest).toEqual([
      {
        clubId: MANAGER,
        season: 1,
        round: 1,
        category: "interest",
        amount: -Math.ceil((1_000_000 * rate) / 10_000),
      },
    ]);
  }, 30000);

  it("obra diminui uma rodada por vez e só aumenta a capacidade no fim", () => {
    const building = structuredClone(start.finances);
    const club = building.clubs[MANAGER];
    if (!club) throw new Error("sem clube");
    const capacity = club.capacity;
    club.works = { seats: 3000, cost: 1, remainingRounds: 2 };
    const one = advanceCareer(start.league, building, testWorld(), { rounds: 1 }, MANAGER);
    if (!one.ok) throw new Error("falhou");
    expect(one.finances.clubs[MANAGER]?.works?.remainingRounds).toBe(1);
    expect(one.finances.clubs[MANAGER]?.capacity).toBe(capacity);
    const two = advanceCareer(one.league, one.finances, testWorld(), { rounds: 1 }, MANAGER);
    if (!two.ok) throw new Error("falhou");
    expect(two.finances.clubs[MANAGER]?.works).toBeUndefined();
    expect(two.finances.clubs[MANAGER]?.capacity).toBe(capacity + 3000);
  }, 30000);

  it("caixa negativo prolongado abre e fecha a crise", () => {
    const rules = economyRules(testWorld(), competitionId());
    const broke = structuredClone(start.finances);
    const club = broke.clubs[MANAGER];
    if (!club) throw new Error("sem clube");
    broke.ledger.push({
      clubId: MANAGER,
      season: 1,
      round: 0,
      category: "prize",
      amount: -club.cash - 50_000_000,
    });
    club.cash = -50_000_000;
    let league = start.league;
    let finances = broke;
    for (let round = 1; round <= rules.crisisRounds; round++) {
      const result = advanceCareer(league, finances, testWorld(), { rounds: 1 }, MANAGER);
      if (!result.ok) throw new Error("falhou");
      ({ league, finances } = result);
      expect(finances.clubs[MANAGER]?.inCrisis).toBe(round >= rules.crisisRounds);
    }
    expect(finances.crises).toEqual([
      { clubId: MANAGER, startSeason: 1, startRound: rules.crisisRounds },
    ]);
    const rescued = structuredClone(finances);
    const saved = rescued.clubs[MANAGER];
    if (!saved) throw new Error("sem clube");
    rescued.ledger.push({
      clubId: MANAGER,
      season: 1,
      round: leagueRound(league) - 1,
      category: "prize",
      amount: 100_000_000,
    });
    saved.cash += 100_000_000;
    const back = advanceCareer(league, rescued, testWorld(), { rounds: 1 }, MANAGER);
    if (!back.ok) throw new Error("falhou");
    expect(back.finances.clubs[MANAGER]).toMatchObject({ inCrisis: false, negativeRounds: 0 });
    expect(back.finances.crises[0]).toMatchObject({
      endSeason: 1,
      endRound: rules.crisisRounds + 1,
    });
  }, 60000);

  it("ao vivo com decisões = direto com a mesma escalação (SC-006)", () => {
    const squad = testWorld().players.filter((player) => player.clubId === MANAGER);
    const { lineup } = managerAutoLineup(squad, "4-4-2", "balanced", []);
    const lineups = { [MANAGER]: lineup };
    const started = startLeagueRound(start.league, testWorld(), lineups);
    if (!started.ok) throw new Error("falhou");
    const live = completeCareerRound(
      start.league,
      start.finances,
      testWorld(),
      finishRound(advanceRound(started.round, 20)),
      MANAGER,
    );
    const direct = advanceCareer(
      start.league,
      start.finances,
      testWorld(),
      { rounds: 1 },
      MANAGER,
      lineups,
    );
    expect(live).toEqual(direct);
    const changed = applyRoundChange(advanceRound(started.round, 20), MANAGER, {
      type: "posture",
      posture: "attacking",
    });
    if (!changed.ok) throw new Error("falhou");
    const decided = completeCareerRound(
      start.league,
      start.finances,
      testWorld(),
      finishRound(changed.round),
      MANAGER,
    );
    expect(decided.ok).toBe(true);
    expect(matchOf(changed.round, MANAGER)).toBeDefined();
  }, 30000);
});
