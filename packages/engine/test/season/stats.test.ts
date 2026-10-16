import { describe, expect, it } from "vitest";
import { seasonStats, topAssists, topScorers } from "../../src/season/stats";
import { playedSeason } from "./helpers/world";

describe("estatísticas da temporada (FR-021, FR-022)", () => {
  const season = playedSeason(31);
  const stats = seasonStats(season);

  it("somam os totais das partidas", () => {
    const lines = season.records.flatMap((record) => Object.values(record.players));
    const sum = (
      pick: (value: { goals: number; assists: number; yellows: number; minutes: number }) => number,
    ) => lines.reduce((total, value) => total + pick(value), 0);
    expect(stats.reduce((total, row) => total + row.goals, 0)).toBe(sum((value) => value.goals));
    expect(stats.reduce((total, row) => total + row.assists, 0)).toBe(
      sum((value) => value.assists),
    );
    expect(stats.reduce((total, row) => total + row.yellows, 0)).toBe(
      sum((value) => value.yellows),
    );
    expect(stats.reduce((total, row) => total + row.minutes, 0)).toBe(
      sum((value) => value.minutes),
    );
    expect(stats.reduce((total, row) => total + row.matches, 0)).toBe(lines.length);
    const goals = season.records.reduce(
      (total, record) => total + record.score.home + record.score.away,
      0,
    );
    const abandonedGoals =
      season.records.filter((record) => record.outcome === "abandoned").length * 3;
    expect(stats.reduce((total, row) => total + row.goals, 0)).toBeLessThanOrEqual(
      goals + abandonedGoals,
    );
  });

  it("contam suspensões e lesões a partir das ausências", () => {
    const absences = season.records.flatMap((record) => [
      ...record.unavailable.home,
      ...record.unavailable.away,
    ]);
    expect(stats.reduce((total, row) => total + row.matchesSuspended, 0)).toBe(
      absences.filter((absence) => absence.reason === "suspension").length,
    );
    expect(stats.reduce((total, row) => total + row.matchesInjured, 0)).toBe(
      absences.filter((absence) => absence.reason === "injury").length,
    );
  });

  it("artilharia ordenada por gols, depois menos partidas, depois id", () => {
    const top = topScorers(season, 10);
    expect(top).toHaveLength(10);
    for (let index = 1; index < top.length; index++) {
      const previous = top[index - 1];
      const current = top[index];
      if (!previous || !current) continue;
      const ordered =
        previous.goals > current.goals ||
        (previous.goals === current.goals &&
          (previous.matches < current.matches ||
            (previous.matches === current.matches && previous.playerId < current.playerId)));
      expect(ordered).toBe(true);
    }
    expect(top[0]?.goals).toBe(Math.max(...stats.map((row) => row.goals)));
  });

  it("assistências ordenadas do mesmo jeito", () => {
    const top = topAssists(season, 5);
    expect(top).toHaveLength(5);
    expect(top[0]?.assists).toBe(Math.max(...stats.map((row) => row.assists)));
  });
});
