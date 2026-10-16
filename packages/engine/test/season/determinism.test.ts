import { describe, expect, it } from "vitest";
import { advanceSeason, isSeasonOver } from "../../src/season/season.js";
import { standings } from "../../src/season/standings.js";
import type { Season } from "../../src/season/types.js";
import { newSeason, playedSeason, testWorld } from "./helpers/world.js";

function advance(season: Season, step: { rounds: number } | { toEnd: true }): Season {
  const result = advanceSeason(season, testWorld(), step);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.season;
}

function stepwise(seed: number, size: number): Season {
  let season = newSeason(seed);
  while (!isSeasonOver(season)) season = advance(season, { rounds: size });
  return season;
}

describe("temporada determinística (FR-005, FR-006, SC-001)", () => {
  it("mesma seed ⇒ mesma temporada", () => {
    expect(advance(newSeason(7), { toEnd: true })).toEqual(playedSeason(7));
  });

  it("rodada a rodada = tudo de uma vez", () => {
    const direct = playedSeason(3);
    expect(stepwise(3, 1)).toEqual(direct);
    expect(stepwise(3, 5)).toEqual(direct);
  });

  it("estado serializado continua igual", () => {
    const midway = advance(newSeason(4), { rounds: 17 });
    const restored: Season = JSON.parse(JSON.stringify(midway));
    expect(advance(restored, { toEnd: true })).toEqual(advance(midway, { toEnd: true }));
  });

  it("seeds diferentes ⇒ temporadas diferentes", () => {
    expect(playedSeason(1).records).not.toEqual(playedSeason(2).records);
  });

  it("temporada encerrada não avança", () => {
    const season = playedSeason(5);
    expect(isSeasonOver(season)).toBe(true);
    expect(advance(season, { rounds: 3 })).toEqual(season);
  });

  it("Série A: 380 jogos, 38 por clube e tabela coerente (SC-002)", () => {
    const season = playedSeason(6);
    expect(season.records).toHaveLength(380);
    const rows = standings(season, testWorld());
    expect(rows).toHaveLength(20);
    for (const row of rows) expect(row.played).toBe(38);
    const goalsFor = rows.reduce((sum, row) => sum + row.goalsFor, 0);
    const goalsAgainst = rows.reduce((sum, row) => sum + row.goalsAgainst, 0);
    const recordGoals = season.records.reduce(
      (sum, record) => sum + record.score.home + record.score.away,
      0,
    );
    expect(goalsFor).toBe(recordGoals);
    expect(goalsAgainst).toBe(recordGoals);
    const draws = season.records.filter((record) => record.score.home === record.score.away).length;
    const points = rows.reduce((sum, row) => sum + row.points, 0);
    expect(points).toBe(3 * (380 - draws) + 2 * draws);
  });
});
