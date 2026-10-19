import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { divisionSeason } from "../../src/career/league";
import type { LeagueSeason } from "../../src/career/types";
import type { CompletedBank } from "../../src/model/types";
import { standings } from "../../src/season/standings";
import {
  finishedLeague,
  newLeague,
  playedLeague,
  singleDivisionWorld,
  testWorld,
  threeDivisionWorld,
} from "./helpers";

function table(league: LeagueSeason, world: CompletedBank, level: number): string[] {
  const season = divisionSeason(league, level);
  if (!season) throw new Error("sem divisão");
  return standings(season, world).map((row) => row.clubId);
}

describe("acesso e rebaixamento (R4, FR-007 a FR-009)", () => {
  it("troca os 4 últimos da Série A pelos 4 primeiros da Série B", () => {
    const league = playedLeague("composicao");
    const serieA = table(league, testWorld(), 1);
    const serieB = table(league, testWorld(), 2);
    const result = nextComposition(league, testWorld());
    const down = serieA.slice(16);
    const up = serieB.slice(0, 4);
    expect(result.relegated[1]).toEqual(down);
    expect(result.promoted[2]).toEqual(up);
    expect(result.promoted[1]).toEqual([]);
    expect(result.relegated[2]).toEqual([]);
    expect(result.composition[1]).toEqual([...serieA.slice(0, 16), ...up].sort());
    expect(result.composition[2]).toEqual([...serieB.slice(4), ...down].sort());
  }, 30000);

  it("mantém 20/20 e uma partição exata dos 40 clubes", () => {
    const result = nextComposition(playedLeague("composicao"), testWorld());
    expect(result.composition[1]).toHaveLength(20);
    expect(result.composition[2]).toHaveLength(20);
    const all = [...(result.composition[1] ?? []), ...(result.composition[2] ?? [])];
    expect(new Set(all).size).toBe(40);
    const bank = testWorld().competitions[0]?.divisions.flatMap((division) => division.clubIds);
    expect([...all].sort()).toEqual([...(bank ?? [])].sort());
  }, 30000);

  it("empate total na linha de corte é decidido pelos critérios da competição", () => {
    const league = finishedLeague(newLeague("empates"), () => [0, 0]);
    const result = nextComposition(league, testWorld());
    expect(result.relegated[1]).toEqual(table(league, testWorld(), 1).slice(16));
    expect(result.promoted[2]).toEqual(table(league, testWorld(), 2).slice(0, 4));
    expect(nextComposition(league, testWorld())).toEqual(result);
  });

  it("funciona com três divisões e vagas diferentes", () => {
    const world = threeDivisionWorld();
    const byId = (fixture: { home: string; away: string }): [number, number] =>
      fixture.home < fixture.away ? [2, 0] : [0, 1];
    const league = finishedLeague(newLeague("tres", {}, world), byId);
    const result = nextComposition(league, world);
    const [first, second, third] = [1, 2, 3].map((level) => table(league, world, level));
    if (!first || !second || !third) throw new Error("sem tabela");
    expect(result.relegated[1]).toEqual(first.slice(12));
    expect(result.promoted[2]).toEqual(second.slice(0, 2));
    expect(result.relegated[2]).toEqual(second.slice(10));
    expect(result.promoted[3]).toEqual(third.slice(0, 3));
    expect(result.composition[1]).toHaveLength(14);
    expect(result.composition[2]).toHaveLength(13);
    expect(result.composition[3]).toHaveLength(13);
    expect(result.composition[2]).toEqual(
      [...first.slice(12), ...second.slice(2, 10), ...third.slice(0, 3)].sort(),
    );
  });

  it("com uma divisão só, ninguém sobe nem desce", () => {
    const world = singleDivisionWorld();
    const league = finishedLeague(newLeague("unica", {}, world), () => [1, 0]);
    const result = nextComposition(league, world);
    expect(result.composition[1]).toEqual([...(divisionSeason(league, 1)?.clubIds ?? [])].sort());
    expect(result.promoted[1]).toEqual([]);
    expect(result.relegated[1]).toEqual([]);
  });
});
