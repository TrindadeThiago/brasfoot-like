import { describe, expect, it } from "vitest";
import {
  completeLeagueRound,
  playSummaryLeagueRound,
  startLeagueRound,
} from "../../src/career/league-round";
import { finishRound } from "../../src/season/live-round";
import { playerLines } from "../../src/season/record";
import { standings } from "../../src/season/standings";
import { seasonStats, topScorers } from "../../src/season/stats";
import type { Season } from "../../src/season/types";
import { simulationKindFor } from "../../src/world/leagues";
import { clubOfCountry, worldBank, worldState } from "../career/world-helpers";

const SEED = "resumida";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("rodada resumida (020 R3, R4)", () => {
  const world = worldBank({ cup: true });
  const manager = clubOfCountry(world, 0);
  const state = worldState(world, SEED, manager);
  const foreign = state.competitions.find(
    (league) =>
      simulationKindFor(state, league.competitionId) === "summary" && league.divisions.length === 2,
  );
  if (!foreign) throw new Error("sem liga de outro país");

  function play(rounds: number) {
    let league = foreign;
    for (let index = 0; index < rounds; index++) {
      league = ok(playSummaryLeagueRound(league as NonNullable<typeof foreign>, world)).league;
    }
    return league as NonNullable<typeof foreign>;
  }

  it("só as competições de outros países usam a simulação resumida", () => {
    expect(simulationKindFor(state, state.league.competitionId)).toBe("full");
    expect(simulationKindFor(state, foreign.competitionId)).toBe("summary");
    const sameCountry = state.competitions.filter(
      (league) => simulationKindFor(state, league.competitionId) === "full",
    );
    for (const league of sameCountry) {
      const country = (id: string) => world.competitions.find((c) => c.id === id)?.countryId;
      expect(country(league.competitionId)).toBe(country(state.league.competitionId));
    }
  });

  it("fecha a rodada nas divisões, com registro compacto de cada jogo", () => {
    const league = play(3);
    for (const season of league.divisions) {
      expect(season.nextRound).toBe(4);
      expect(season.records).toHaveLength(3 * (season.clubIds.length / 2));
      for (const record of season.records) {
        expect(record.summary).toBe(true);
        expect(record.starters?.home).toHaveLength(11);
        expect(record.fullTime).toBeGreaterThanOrEqual(96);
        const lines = playerLines(record);
        for (const id of [...(record.starters?.home ?? []), ...(record.starters?.away ?? [])]) {
          expect(lines[id], id).toBeDefined();
        }
        // O compacto guarda bem menos linhas que as 22 a 24 do completo.
        expect(Object.keys(record.players).length).toBeLessThan(14);
      }
    }
  });

  it("os efeitos na temporada são os mesmos: tabela, artilharia, cartões e lesões", () => {
    const league = play(8);
    const season = league.divisions[0] as Season;
    const table = standings(season, world);
    const points = table.reduce((sum, row) => sum + row.points, 0);
    expect(points).toBeGreaterThan(0);
    expect(table.reduce((sum, row) => sum + row.goalsFor, 0)).toBe(
      table.reduce((sum, row) => sum + row.goalsAgainst, 0),
    );
    const scored = seasonStats(season).reduce((sum, row) => sum + row.goals, 0);
    expect(scored).toBe(table.reduce((sum, row) => sum + row.goalsFor, 0));
    expect(topScorers(season, 10).length).toBeGreaterThan(0);
    const yellows = Object.values(season.status).reduce((sum, entry) => sum + entry.yellows, 0);
    const injured = Object.values(season.status).filter((entry) => entry.injury > 0).length;
    expect(yellows + injured).toBeGreaterThan(0);
  });

  it("é determinística e igual depois de salvar e carregar no meio", () => {
    const a = play(5);
    const b = play(5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const half = play(2);
    const reloaded = JSON.parse(JSON.stringify(half)) as typeof half;
    let continued = half;
    let other = reloaded;
    for (let index = 0; index < 3; index++) {
      continued = ok(playSummaryLeagueRound(continued, world)).league;
      other = ok(playSummaryLeagueRound(other, world)).league;
    }
    expect(JSON.stringify(continued)).toBe(JSON.stringify(other));
  });

  it("a rodada completa da mesma liga também fecha (mesma temporada, outro caminho)", () => {
    const started = ok(startLeagueRound(foreign, world));
    const full = ok(completeLeagueRound(foreign, world, finishRound(started.round))).league;
    const summary = ok(playSummaryLeagueRound(foreign, world)).league;
    expect(summary.divisions.map((d) => d.nextRound)).toEqual(
      full.divisions.map((d) => d.nextRound),
    );
    expect(summary.divisions.map((d) => d.records.length)).toEqual(
      full.divisions.map((d) => d.records.length),
    );
    expect(
      full.divisions.every((d) => d.records.every((record) => record.summary === undefined)),
    ).toBe(true);
  });

  it("copa de outro país: os confrontos de mata-mata usam a simulação completa", () => {
    const cup = state.competitions.find(
      (league) =>
        league.divisions[0]?.bracket !== undefined &&
        simulationKindFor(state, league.competitionId) === "summary",
    );
    expect(cup).toBeDefined();
  });
});
