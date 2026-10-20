import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { clubDivision } from "../../src/career/league";
import { seasonTurnover, TURNOVER_STEP_IDS } from "../../src/career/turnover";
import { annualWageBill, sponsorshipFor } from "../../src/finance/create";
import { advanceCareer } from "../../src/finance/round";
import { divisionEconomy, economyRules } from "../../src/finance/rules";
import { prizeFor } from "../../src/finance/turnover";
import { LEDGER_CATEGORIES } from "../../src/finance/types";
import { standings } from "../../src/season/standings";
import { competitionId } from "../career/helpers";
import { career, testWorld } from "./helpers";

const SEED = "virada-financas";
const MANAGER = "clube-001";
const start = career(SEED);
const played = advanceCareer(start.league, start.finances, testWorld(), { toEnd: true }, MANAGER);
if (!played.ok) throw new Error("falhou");
const finished = played;
const rules = economyRules(testWorld(), competitionId());

function turn() {
  const result = seasonTurnover(finished.league, testWorld(), [], {
    careerSeed: SEED,
    finances: finished.finances,
    managerClubId: MANAGER,
  });
  if (!result.ok || !result.finances) throw new Error(JSON.stringify(result));
  return { ...result, finances: result.finances };
}

describe("virada financeira (US3, FR-011, FR-012, FR-025)", () => {
  it("ordem das etapas padrão", () => {
    expect(TURNOVER_STEP_IDS).toEqual([
      "record-history",
      "pay-prizes",
      "close-finance-season",
      "return-loans",
      "evolve-players",
      "retire-players",
      "expire-contracts",
      "regulate-world",
      "generate-youth",
      "balance-squads",
      "age-out-free-agents",
      "promotion-relegation",
      "advance-year",
      "reset-season-stats",
      "generate-calendars",
      "pay-sponsorship",
      "ai-finance-review",
      "reset-market",
      "board-new-season",
    ]);
  });

  it("premiação linear por posição e prêmio de título", () => {
    const { first, last, title } = divisionEconomy(rules, 1).prizes;
    expect(prizeFor(rules, 1, 1, 20, true)).toBe(first + title);
    expect(prizeFor(rules, 1, 1, 20, false)).toBe(first);
    expect(prizeFor(rules, 1, 20, 20, false)).toBe(last);
    const middle = prizeFor(rules, 1, 10, 20, false);
    expect(middle).toBeLessThan(first);
    expect(middle).toBeGreaterThan(last);
  });

  it("resumo da temporada de cada clube inclui a premiação e fecha com o caixa", () => {
    const { finances } = turn();
    expect(finances.seasons).toHaveLength(40);
    for (const season of finished.league.divisions) {
      const table = standings(season, testWorld());
      for (const row of table) {
        const summary = finances.seasons.find((item) => item.clubId === row.clubId);
        if (!summary) throw new Error("sem resumo");
        const prize = prizeFor(
          rules,
          season.divisionLevel,
          row.position,
          table.length,
          row.position === 1,
        );
        expect(summary.totals.prize).toBe(prize);
        const sum = LEDGER_CATEGORIES.reduce(
          (total, category) => total + summary.totals[category],
          0,
        );
        expect(summary.endCash).toBe(summary.startCash + sum);
        expect(summary).toMatchObject({ season: 1, year: finished.league.year });
        expect(summary.endCash).toBe((finished.finances.clubs[row.clubId]?.cash ?? 0) + prize);
      }
    }
  });

  it("zera lançamentos e bilheterias e lança o patrocínio pela nova divisão", () => {
    const { finances, league } = turn();
    expect(finances.gates).toEqual([]);
    expect(finances.ledger.every((entry) => entry.season === 2 && entry.round === 0)).toBe(true);
    expect(
      finances.ledger.every((entry) =>
        ["sponsorship", "loan_in", "loan_out"].includes(entry.category),
      ),
    ).toBe(true);
    expect(finances.ledger.filter((entry) => entry.category === "sponsorship")).toHaveLength(40);
    const moves = nextComposition(finished.league, testWorld());
    const promoted = moves.promoted[2]?.[0] as string;
    const relegated = moves.relegated[1]?.[0] as string;
    for (const clubId of [promoted, relegated]) {
      const level = clubDivision(league, clubId)?.divisionLevel ?? 0;
      const reputation = testWorld().clubs.find((club) => club.id === clubId)?.reputation ?? 0;
      const entry = finances.ledger.find(
        (item) => item.clubId === clubId && item.category === "sponsorship",
      );
      const wages = annualWageBill(testWorld(), clubId, testWorld().manifest.referenceDate);
      expect(entry?.amount).toBe(sponsorshipFor(rules, level, reputation, wages));
      const club = finances.clubs[clubId];
      const own = finances.ledger.filter((item) => item.clubId === clubId);
      expect(club?.cash).toBe(
        (club?.seasonStartCash ?? 0) + own.reduce((sum, item) => sum + item.amount, 0),
      );
    }
    expect(clubDivision(league, promoted)?.divisionLevel).toBe(1);
    expect(clubDivision(league, relegated)?.divisionLevel).toBe(2);
  });

  it("dívida e obras atravessam a virada", () => {
    const withState = structuredClone(finished.finances);
    const club = withState.clubs[MANAGER];
    if (!club) throw new Error("sem clube");
    club.debt = 700_000;
    club.works = { seats: 2000, cost: 1, remainingRounds: 3 };
    const result = seasonTurnover(finished.league, testWorld(), [], {
      careerSeed: SEED,
      finances: withState,
      managerClubId: MANAGER,
    });
    if (!result.ok || !result.finances) throw new Error("falhou");
    expect(result.finances.clubs[MANAGER]?.debt).toBe(700_000);
    expect(result.finances.clubs[MANAGER]?.works).toEqual({
      seats: 2000,
      cost: 1,
      remainingRounds: 3,
    });
  });

  it("é determinística e não altera a entrada", () => {
    const snapshot = JSON.stringify(finished.finances);
    expect(turn()).toEqual(turn());
    expect(JSON.stringify(finished.finances)).toBe(snapshot);
  });
}, 60000);
