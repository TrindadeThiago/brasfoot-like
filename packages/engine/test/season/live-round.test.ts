import { describe, expect, it } from "vitest";
import { managerAutoLineup } from "../../src/lineup/auto";
import {
  advanceRound,
  completeRound,
  finishRound,
  isRoundFinished,
  type LiveRound,
  matchOf,
  startRound,
} from "../../src/season/live-round";
import { advanceSeason, isSeasonOver } from "../../src/season/season";
import type { Season } from "../../src/season/types";
import { newSeason, testWorld } from "./helpers/world";

function started(season: Season, lineups?: Parameters<typeof startRound>[2]): LiveRound {
  const result = startRound(season, testWorld(), lineups);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.round;
}

function complete(season: Season, round: LiveRound): Season {
  const result = completeRound(season, testWorld(), round);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.season;
}

describe("rodada ao vivo (R1)", () => {
  it("prepara as 10 partidas da próxima rodada, ainda não iniciadas", () => {
    const season = newSeason("ao-vivo");
    const round = started(season);
    expect(round.round).toBe(1);
    expect(round.tick).toBe(0);
    expect(round.matches).toHaveLength(10);
    expect(round.matches.map((match) => match.fixture)).toEqual(season.calendar[0]?.fixtures);
    expect(round.matches.every((match) => match.state.status === "not_started")).toBe(true);
    expect(isRoundFinished(round)).toBe(false);
  });

  it("avançar de 1 em 1, de 7 em 7 ou até o fim dá o mesmo resultado", () => {
    const season = newSeason("passos");
    let one = started(season);
    while (!isRoundFinished(one)) one = advanceRound(one, 1);
    let seven = started(season);
    while (!isRoundFinished(seven)) seven = advanceRound(seven, 7);
    const end = finishRound(started(season));
    expect(one.matches.map((m) => m.state)).toEqual(end.matches.map((m) => m.state));
    expect(seven.matches.map((m) => m.state)).toEqual(end.matches.map((m) => m.state));
    expect(one.tick).toBeGreaterThan(90);
  });

  it("fechar a rodada é igual a advanceSeason de uma rodada", () => {
    const season = newSeason("fechar");
    const viaLive = complete(season, finishRound(started(season)));
    const direct = advanceSeason(season, testWorld(), { rounds: 1 });
    if (!direct.ok) throw new Error("falhou");
    expect(viaLive).toEqual(direct.season);
    expect(viaLive.nextRound).toBe(2);
  });

  it("usa a escalação externa do clube do jogador", () => {
    const season = newSeason("externa");
    const clubId = season.calendar[0]?.fixtures[0]?.home as string;
    const squad = testWorld().players.filter((player) => player.clubId === clubId);
    const lineup = managerAutoLineup(squad, "5-3-2", "attacking", []).lineup;
    const round = started(season, { [clubId]: lineup });
    const found = matchOf(round, clubId);
    expect(found?.side).toBe("home");
    expect(found?.match.state.teams.home.formation).toBe("5-3-2");
    expect(found?.match.state.teams.home.posture).toBe("attacking");
  });

  it("não fecha rodada inacabada nem de outra rodada", () => {
    const season = newSeason("inacabada");
    expect(() => completeRound(season, testWorld(), advanceRound(started(season), 10))).toThrow();
    const next = complete(season, finishRound(started(season)));
    expect(() => completeRound(next, testWorld(), finishRound(started(season)))).toThrow();
  });

  it("a temporada inteira pela rodada ao vivo é igual a advanceSeason até o fim", () => {
    for (const seed of ["temporada-a", "temporada-b"]) {
      let season = newSeason(seed);
      while (!isSeasonOver(season)) season = complete(season, finishRound(started(season)));
      const direct = advanceSeason(newSeason(seed), testWorld(), { toEnd: true });
      if (!direct.ok) throw new Error("falhou");
      expect(season).toEqual(direct.season);
    }
  });

  it("um passo das 10 partidas leva menos de 5 ms", () => {
    let round = started(newSeason("rapido"));
    const times: number[] = [];
    for (let i = 0; i < 50; i++) {
      const start = performance.now();
      round = advanceRound(round, 1);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    expect(times[25]).toBeLessThan(5);
  });
});
