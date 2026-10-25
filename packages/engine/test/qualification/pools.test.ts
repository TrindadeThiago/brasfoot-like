import { describe, expect, it } from "vitest";
import { cupSeasonOf } from "../../src/knockout/history";
import { cupChampion, cupReached } from "../../src/knockout/tie";
import { QualificationSourceError } from "../../src/qualification/errors";
import { berthSize, finishedByCompetition, poolOf } from "../../src/qualification/pools";
import { standings } from "../../src/season/standings";
import { allSeasons } from "../career/qualification-helpers";
import { baseWorld, playedOnce } from "./helpers";

describe("fontes de vaga (021 R1, R3)", () => {
  const { world, ids } = baseWorld();
  const { end } = playedOnce(world, "pools-021");
  const finished = finishedByCompetition(allSeasons(end));
  const league = finished.get(ids.league);
  const cupSeason = cupSeasonOf(finished.get(ids.cup) as NonNullable<typeof league>);
  const table = standings(
    league?.divisions[0] as NonNullable<typeof league>["divisions"][number],
    end.world,
  );

  it("position devolve a faixa da tabela final, na ordem", () => {
    const pool = poolOf(end.world, finished, {
      kind: "position",
      competitionId: ids.league,
      level: 1,
      from: 2,
      to: 4,
    });
    expect(pool.map((row) => row.clubId)).toEqual(table.slice(1, 4).map((row) => row.clubId));
    expect(pool.map((row) => row.position)).toEqual([2, 3, 4]);
  });

  it("champion e runnerUp da liga são o 1º e o 2º da divisão 1", () => {
    const champion = poolOf(end.world, finished, { kind: "champion", competitionId: ids.league });
    const runnerUp = poolOf(end.world, finished, { kind: "runnerUp", competitionId: ids.league });
    expect(champion.map((row) => row.clubId)).toEqual([table[0]?.clubId]);
    expect(runnerUp.map((row) => row.clubId)).toEqual([table[1]?.clubId]);
  });

  it("champion e runnerUp da copa vêm da final", () => {
    const result = cupChampion(cupSeason as NonNullable<typeof cupSeason>);
    expect(
      poolOf(end.world, finished, { kind: "champion", competitionId: ids.cup })[0]?.clubId,
    ).toBe(result?.championId);
    expect(
      poolOf(end.world, finished, { kind: "runnerUp", competitionId: ids.cup })[0]?.clubId,
    ).toBe(result?.runnerUpId);
  });

  it("reached: fase decrescente, depois id; o tamanho bate com berthSize", () => {
    const source = { kind: "reached", competitionId: ids.cup, phase: 3 } as const;
    const pool = poolOf(end.world, finished, source);
    const reached = cupReached(cupSeason as NonNullable<typeof cupSeason>);
    expect(pool).toHaveLength(berthSize(end.world, source));
    const values = pool.map((row) => reached[row.clubId] as number);
    expect([...values].sort((a, b) => b - a)).toEqual(values);
    expect(pool[0]?.clubId).toBe(
      poolOf(end.world, finished, { kind: "champion", competitionId: ids.cup })[0]?.clubId,
    );
  });

  it("fonte de competição ausente da temporada encerrada lança erro claro", () => {
    expect(() =>
      poolOf(end.world, finished, { kind: "champion", competitionId: "nao-existe" }),
    ).toThrow(QualificationSourceError);
  });
});
