import { describe, expect, it } from "vitest";
import { advanceCareer } from "../../../src/career/day";
import { reportForDivision, reportHighlights } from "../../../src/market/ai/report";
import { DEFAULT_AI_MARKET } from "../../../src/market/ai/rules";
import { initialRenewal } from "../../../src/renewal/measure";
import { MANAGER, marketContext, SEED } from "../helpers";

const ctx = marketContext();
const played = advanceCareer(
  ctx.league,
  ctx.finances,
  ctx.world,
  { rounds: 5 },
  MANAGER,
  undefined,
  { state: initialRenewal(ctx.world), careerSeed: SEED },
  { state: ctx.market, careerSeed: SEED },
);
if (!played.ok || !played.market) throw new Error("falhou");
const report = played.market.reports[0];

describe("resumo da janela (011 R10, FR-013)", () => {
  it("é criado quando a janela fecha, com as transferências dela", () => {
    expect(played.market?.reports).toHaveLength(1);
    if (!report) throw new Error("sem resumo");
    expect(report.id).toBe(`${ctx.league.number}-0`);
    expect(report.transfers.length).toBeGreaterThan(0);
    for (const entry of report.transfers) {
      expect(entry.round).toBeLessThanOrEqual(3);
      expect(entry.outcome).toBeUndefined();
    }
  });

  it("ordenado por valor e depois força", () => {
    if (!report) throw new Error("sem resumo");
    for (let index = 1; index < report.transfers.length; index++) {
      const previous = report.transfers[index - 1];
      const current = report.transfers[index];
      if (!previous || !current) continue;
      expect(previous.fee).toBeGreaterThanOrEqual(current.fee);
    }
    expect(reportHighlights(report, 5)).toEqual(report.transfers.slice(0, 5));
  });

  it("filtra pela divisão", () => {
    if (!report) throw new Error("sem resumo");
    const serieB = reportForDivision(report, 2);
    for (const entry of serieB) expect(entry.fromLevel === 2 || entry.toLevel === 2).toBe(true);
  });

  it("guarda no máximo keepReports resumos", () => {
    expect(DEFAULT_AI_MARKET.keepReports).toBeGreaterThan(0);
    expect(played.market?.reports.length).toBeLessThanOrEqual(DEFAULT_AI_MARKET.keepReports);
  });
});
