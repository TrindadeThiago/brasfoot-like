import { describe, expect, it } from "vitest";
import { advanceCareer } from "../../src/finance/round";
import { seasonFinanceSummary } from "../../src/finance/summary";
import { LEDGER_CATEGORIES } from "../../src/finance/types";
import { career, testWorld } from "./helpers";

describe("resumo financeiro da temporada (US4)", () => {
  it("totais por categoria + saldo inicial = saldo atual", () => {
    const start = career("resumo");
    const played = advanceCareer(
      start.league,
      start.finances,
      testWorld(),
      { rounds: 6 },
      "clube-001",
    );
    if (!played.ok) throw new Error("falhou");
    for (const clubId of Object.keys(played.finances.clubs)) {
      const summary = seasonFinanceSummary(played.finances, clubId);
      const sum = LEDGER_CATEGORIES.reduce(
        (total, category) => total + summary.totals[category],
        0,
      );
      expect(summary.cash).toBe(summary.startCash + sum);
      expect(summary.totals.wages).toBeLessThan(0);
      expect(summary.totals.sponsorship).toBeGreaterThan(0);
      expect(summary.startCash).toBe(played.finances.clubs[clubId]?.seasonStartCash);
    }
  }, 30000);
});
