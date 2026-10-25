import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import type { Berth, CompletedBank } from "../../src/model/types";
import { resolveQualification } from "../../src/qualification/resolve";
import { standings } from "../../src/season/standings";
import { allSeasons } from "../career/qualification-helpers";
import { baseWorld, clone, playedOnce, superCup } from "./helpers";

// Saída da pirâmide (021 R5): a última divisão rebaixa para fora quando recebe clubes por vagas.
describe("acesso e saída da pirâmide por vagas externas", () => {
  const { world, ids } = baseWorld();
  const size = ids.second.length;

  /**
   * Banco em que a última divisão rebaixa `out` clubes para fora e recebe `out` por vaga. A fonte é
   * o campeão de uma final entre dois clubes da divisão de cima, que a condição `forbid` recusa: o
   * repasse chega ao fechamento (a tabela inteira da própria divisão).
   */
  function withExit(out: number): CompletedBank {
    const next = clone(world) as CompletedBank;
    const league = next.competitions.find((entry) => entry.id === ids.league);
    const bottom = league?.divisions[1];
    if (!league || !bottom) throw new Error("sem divisão");
    bottom.relegationSlots = out;
    bottom.berths = Array.from(
      { length: out },
      (_, k): Berth => ({
        id: `externa-${k}`,
        source: { kind: "champion", competitionId: "referencia" },
        forbid: [{ competitionId: ids.league, level: 1 }],
        fallback: [{ kind: "position", competitionId: ids.league, level: 2, from: 1, to: size }],
      }),
    );
    const reference = superCup(ids, [], ids.top.slice(0, 2), "referencia");
    delete (reference.divisions[0] as { berths?: unknown }).berths;
    next.competitions.push(reference);
    return next;
  }

  it("nextComposition devolve quem sai pela última divisão", () => {
    const { end } = playedOnce(withExit(2), "saida-021");
    const league = allSeasons(end).find((entry) => entry.competitionId === ids.league);
    if (!league) throw new Error("sem liga");
    const change = nextComposition(league, end.world);
    const table = standings(league.divisions[1] as (typeof league.divisions)[number], end.world);
    expect(change.relegatedOut).toEqual(table.slice(size - 2).map((row) => row.clubId));
    expect(change.composition[2]).toHaveLength(size - 2);
    expect(change.composition[2]?.some((id) => change.relegatedOut.includes(id))).toBe(false);
    expect(change.promotedOut).toEqual([]);
  });

  it("sem vagas na divisão, ninguém sai da pirâmide", () => {
    const { end } = playedOnce(world, "saida-021");
    const league = allSeasons(end).find((entry) => entry.competitionId === ids.league);
    if (!league) throw new Error("sem liga");
    const change = nextComposition(league, end.world);
    expect(change.relegatedOut).toEqual([]);
    expect(change.promotedOut).toEqual([]);
  });

  it("a divisão recebe por vaga o mesmo número que sai, sem repetição, e o repasse chega ao fechamento", () => {
    const { end, compositions } = playedOnce(withExit(2), "saida-021");
    const outcome = resolveQualification({
      world: end.world,
      finished: allSeasons(end),
      compositions,
      number: 1,
      year: 2027,
    });
    if (!outcome.ok) throw new Error(JSON.stringify(outcome.error));
    const second = outcome.result.compositions[ids.league]?.[2] ?? [];
    expect(second).toHaveLength(size);
    expect(new Set(second).size).toBe(size);
    const entries = outcome.result.record.entries.filter((item) => item.level === 2);
    expect(entries).toHaveLength(2);
    expect(entries.every((item) => item.via === "pass")).toBe(true);
    expect(entries.every((item) => item.passedFrom?.reason === "forbid")).toBe(true);
    // Sem origem direta, os dois voltam pelo fechamento: são os que saíram.
    expect(new Set(entries.map((item) => item.clubId)).size).toBe(2);
  });
});
