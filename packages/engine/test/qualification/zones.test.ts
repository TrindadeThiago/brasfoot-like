import { describe, expect, it } from "vitest";
import { divisionZones } from "../../src/career/league";
import type { Berth, CompletedBank } from "../../src/model/types";
import { berthZones } from "../../src/qualification/zones";
import { baseWorld, clone, type Ids, superCup } from "./helpers";

function worldWith(ids: Ids, world: CompletedBank, berths: Berth[], clubs: string[]) {
  const next = clone(world) as CompletedBank;
  next.competitions.push(superCup(ids, berths, clubs, "alimentada"));
  return next;
}

describe("zonas de vaga na tabela (021 R7)", () => {
  const { world, ids } = baseWorld();

  it("competição sem vagas devolve lista vazia e divisionZones mantém acesso e rebaixamento", () => {
    expect(berthZones(world, ids.league, 1)).toEqual([]);
    const zones = divisionZones(world, ids.league, 1);
    expect(zones.berths).toEqual([]);
    expect(zones.relegation).toBeGreaterThan(0);
  });

  it("position vira faixa; champion e runnerUp da liga viram as posições 1 e 2 da divisão 1", () => {
    const closing = {
      kind: "position",
      competitionId: ids.league,
      level: 1,
      from: 1,
      to: 8,
    } as const;
    const berths: Berth[] = [
      {
        id: "top3",
        source: { kind: "position", competitionId: ids.league, level: 1, from: 1, to: 2 },
        fallback: [closing],
      },
      {
        id: "vice",
        source: { kind: "runnerUp", competitionId: ids.league },
        fallback: [closing],
        entry: { phase: 2 },
      },
    ];
    const next = worldWith(ids, world, berths, ids.top.slice(0, 3));
    const zones = berthZones(next, ids.league, 1);
    expect(zones).toEqual([
      { from: 1, to: 2, competitionId: "alimentada", level: 1, berthId: "top3" },
      {
        from: 2,
        to: 2,
        competitionId: "alimentada",
        level: 1,
        berthId: "vice",
        entry: { phase: 2 },
      },
    ]);
    expect(divisionZones(next, ids.league, 1).berths).toEqual(zones);
    // outra divisão não é afetada
    expect(berthZones(next, ids.league, 2)).toEqual([]);
  });

  it("a fonte de uma copa não marca tabela", () => {
    const berths: Berth[] = [
      {
        id: "campeao",
        source: { kind: "champion", competitionId: ids.cup },
        fallback: [{ kind: "position", competitionId: ids.league, level: 1, from: 1, to: 8 }],
      },
    ];
    const next = worldWith(ids, world, berths, ids.top.slice(0, 1));
    expect(berthZones(next, ids.cup, 1)).toEqual([]);
  });
});
