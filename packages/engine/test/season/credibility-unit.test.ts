import { describe, expect, it } from "vitest";
import {
  aggregateCredibility,
  clubStrength,
  seasonReport,
  spearman,
} from "../../src/season/credibility.js";
import { SEASON_CREDIBILITY_LIMITS as L } from "../../src/season/limits.js";
import { standings } from "../../src/season/standings.js";
import { topScorers } from "../../src/season/stats.js";
import type { SeasonReport } from "../../src/season/types.js";
import { playedSeason, testWorld } from "./helpers/world.js";

describe("spearman", () => {
  it("vale 1 para ordens iguais, −1 para inversas e trata empates", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [40, 30, 20, 10])).toBeCloseTo(-1);
    expect(spearman([1, 1, 2, 3], [1, 2, 3, 4])).toBeCloseTo(0.9487, 3);
  });
});

describe("clubStrength e seasonReport", () => {
  it("força inicial = média dos 16 melhores", () => {
    const clubId = testWorld().clubs[0]?.id as string;
    const top = testWorld()
      .players.filter((player) => player.clubId === clubId)
      .map((player) => player.strength)
      .sort((a, b) => b - a)
      .slice(0, 16);
    expect(clubStrength(testWorld(), clubId)).toBeCloseTo(
      top.reduce((sum, value) => sum + value, 0) / 16,
    );
  });

  it("relatório coerente com a tabela e a artilharia", () => {
    const season = playedSeason(41);
    const report = seasonReport(season, testWorld());
    const table = standings(season, testWorld());
    expect(report.championId).toBe(table[0]?.clubId);
    expect(report.championPoints).toBe(table[0]?.points);
    expect(report.lastPoints).toBe(table.at(-1)?.points);
    expect(report.topScorerGoals).toBe(topScorers(season, 1)[0]?.goals);
    expect(report.championStrengthRank).toBeGreaterThanOrEqual(1);
    expect(report.championStrengthRank).toBeLessThanOrEqual(20);
  });
});

describe("aggregateCredibility", () => {
  const good: SeasonReport = {
    championId: "c",
    championPoints: 80,
    lastPoints: 25,
    championStrengthRank: 1,
    unbeatenClubs: 0,
    spearman: 0.8,
    goalsPerMatch: 2.6,
    drawRate: 0.26,
    topScorerGoals: 22,
  };

  it("marca ✓ quando tudo está nas faixas e ✗ quando não", () => {
    const reports = Array.from({ length: 10 }, (_, index) => ({
      ...good,
      championStrengthRank: index < 5 ? 1 : index < 8 ? 2 : 6,
    }));
    expect(aggregateCredibility(reports).every((check) => check.ok)).toBe(true);
    const bad = reports.map((report) => ({ ...report, championPoints: 99 }));
    const check = aggregateCredibility(bad).find(
      (entry) => entry.criterion === "championPointsRate",
    );
    expect(check?.ok).toBe(false);
    expect(check?.min).toBe(L.minChampionPointsRate);
  });
});
