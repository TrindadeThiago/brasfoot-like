import { describe, expect, it } from "vitest";
import type { CompletedBank, StageFormat } from "../../src/model/types";
import {
  groupStandings,
  groupTables,
  overallStandings,
  stageOrigin,
  stageQualifiers,
} from "../../src/stages/classification";
import {
  extrasBank,
  groupsStage,
  knockoutAfterGroups,
  LOWER_LEVEL,
  regionalBank,
  STAGES_ID,
} from "../fixtures/stages-bank";
import { groupsState, lcg, record, roundRobin, syntheticSeason } from "./helpers";

// 019 (T014): tabela de grupo, classificação geral e classificados (research.md R5).

function ids(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
}

/** Banco com as fases da divisão de baixo trocadas. */
function withStages(world: CompletedBank, stages: StageFormat[]): CompletedBank {
  const copy = JSON.parse(JSON.stringify(world)) as CompletedBank;
  const lower = copy.competitions
    .find((competition) => competition.id === STAGES_ID)
    ?.divisions.find((division) => division.level === LOWER_LEVEL);
  if (lower) lower.stages = stages;
  return copy;
}

/** Resultados aleatórios determinísticos para todos os grupos. */
function randomResults(groups: Record<string, string[]>, seed: number) {
  const next = lcg(seed);
  return Object.values(groups).flatMap((group) =>
    roundRobin(group, 1, () => [Math.floor(next() * 4), Math.floor(next() * 4)]),
  );
}

describe("groupStandings", () => {
  const world = regionalBank();
  const groups = { A: ids("a", 5), B: ids("b", 5) };

  it("usa só os jogos do grupo e das rodadas da fase", () => {
    const records = [
      ...roundRobin(groups.A, 1, (home) => (home === "a1" ? [3, 0] : [1, 1])),
      ...roundRobin(groups.B, 1, () => [5, 0]),
      // jogo de fora da fase (rodada 9, fase eliminatória): não conta
      record(9, "a2", "a3", 9, 0),
    ];
    const season = syntheticSeason(world, [groupsState(0, groups, 1, 5)], records);
    const table = groupStandings(season, world, 0, "A");
    expect(table).toHaveLength(5);
    expect(table[0]?.clubId).toBe("a1");
    expect(table.map((row) => row.position)).toEqual([1, 2, 3, 4, 5]);
    expect(table.every((row) => row.played === 4)).toBe(true);
    expect(table.every((row) => groups.A.includes(row.clubId))).toBe(true);
    // o 9 a 0 da rodada 9 não entrou: o a2 só marcou os 3 empates de 1 a 1 em casa
    expect(table.find((row) => row.clubId === "a2")?.goalsFor).toBe(3);
  });

  it("aplica o confronto direto dentro do grupo quando a fase o lista", () => {
    const own = withStages(world, [
      groupsStage(5, 2, { tiebreakers: ["head-to-head", "draw-lots"] }),
      knockoutAfterGroups(8),
    ]);
    // a1 e a2 terminam com 3 pontos cada; a2 venceu o confronto direto (e tem pior saldo)
    const records = [
      record(1, "a1", "a2", 0, 1),
      record(2, "a1", "a3", 5, 0),
      record(3, "a2", "a4", 0, 3),
      record(4, "a3", "a4", 1, 1),
    ];
    const season = syntheticSeason(own, [groupsState(0, { A: groups.A }, 1, 5)], records);
    const table = groupStandings(season, own, 0, "A");
    const order = table.map((row) => row.clubId);
    expect(order.indexOf("a2")).toBeLessThan(order.indexOf("a1"));
  });

  it("groupTables devolve uma tabela por grupo, na ordem das letras", () => {
    const season = syntheticSeason(world, [groupsState(0, groups, 1, 5)], randomResults(groups, 1));
    const tables = groupTables(season, world, 0);
    expect(tables.map((entry) => entry.group.id)).toEqual(["A", "B"]);
    expect(tables.map((entry) => entry.rows.length)).toEqual([5, 5]);
  });
});

describe("overallStandings", () => {
  const world = regionalBank();
  const groups = { A: ids("a", 5), B: ids("b", 5), C: ids("c", 5), D: ids("d", 5) };

  it("junta todos os grupos numa ordem total, com grupo e posição no grupo", () => {
    const season = syntheticSeason(world, [groupsState(0, groups, 1, 5)], randomResults(groups, 7));
    const overall = overallStandings(season, world, 0);
    expect(overall).toHaveLength(20);
    expect(overall.map((row) => row.position)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (let index = 1; index < overall.length; index++) {
      expect((overall[index - 1]?.points ?? 0) >= (overall[index]?.points ?? 0)).toBe(true);
    }
    const first = overall[0];
    expect(first?.group).toBeDefined();
    expect(first?.groupPosition).toBeGreaterThanOrEqual(1);
  });

  it("ignora o confronto direto e sempre desempata (sorteio pela seed, determinístico)", () => {
    const own = withStages(world, [
      groupsStage(5, 2, { tiebreakers: ["head-to-head"] }),
      knockoutAfterGroups(8),
    ]);
    // todos empatam em tudo: a ordem só pode vir do sorteio
    const records = Object.values(groups).flatMap((group) => roundRobin(group, 1, () => [1, 1]));
    const first = syntheticSeason(own, [groupsState(0, groups, 1, 5)], records);
    const again = syntheticSeason(own, [groupsState(0, groups, 1, 5)], [...records].reverse());
    const a = overallStandings(first, own, 0).map((row) => row.clubId);
    const b = overallStandings(again, own, 0).map((row) => row.clubId);
    expect(new Set(a).size).toBe(20);
    expect(a).toEqual(b);
    const other = syntheticSeason(own, [groupsState(0, groups, 1, 5)], records, { seed: "outra" });
    expect(overallStandings(other, own, 0).map((row) => row.clubId)).not.toEqual(a);
  });
});

describe("stageQualifiers", () => {
  it("N primeiros de cada grupo, sem vagas extras, na ordem melhor → pior", () => {
    const world = regionalBank();
    const groups = { A: ids("a", 5), B: ids("b", 5), C: ids("c", 5), D: ids("d", 5) };
    const season = syntheticSeason(world, [groupsState(0, groups, 1, 5)], randomResults(groups, 3));
    const qualifiers = stageQualifiers(season, world, 0);
    expect(qualifiers).toHaveLength(8);
    expect(qualifiers.every((q) => q.groupPosition <= 2 && !q.extra)).toBe(true);
    for (const id of ["A", "B", "C", "D"]) {
      expect(qualifiers.filter((q) => q.group === id)).toHaveLength(2);
    }
    // ordenados por posição no grupo e depois pela classificação geral
    const keys = qualifiers.map((q) => q.groupPosition * 100 + q.overallPosition);
    expect(keys).toEqual([...keys].sort((x, y) => x - y));
  });

  it("vagas extras saem só da posição seguinte, pela classificação geral entre elas", () => {
    const world = extrasBank();
    const groups = Object.fromEntries(
      ["A", "B", "C", "D", "E", "F"].map((id) => [id, ids(id.toLowerCase(), 4)]),
    );
    for (let seed = 1; seed <= 20; seed++) {
      const season = syntheticSeason(
        world,
        [groupsState(0, groups, 1, 3)],
        randomResults(groups, seed),
      );
      const qualifiers = stageQualifiers(season, world, 0);
      expect(qualifiers).toHaveLength(16);
      expect(new Set(qualifiers.map((q) => q.clubId)).size).toBe(16);
      const extras = qualifiers.filter((q) => q.extra);
      expect(extras).toHaveLength(4);
      expect(extras.every((q) => q.groupPosition === 3)).toBe(true);
      const overall = overallStandings(season, world, 0);
      const thirds = overall
        .filter((row) => row.groupPosition === 3)
        .sort((x, y) => x.position - y.position)
        .slice(0, 4)
        .map((row) => row.clubId);
      expect(extras.map((q) => q.clubId).sort()).toEqual([...thirds].sort());
      // ninguém de 4º lugar entra
      expect(qualifiers.some((q) => q.groupPosition === 4)).toBe(false);
    }
  });

  it("fase de pontos corridos: os primeiros da tabela, sem grupo", () => {
    const world = withStages(regionalBank(), [
      {
        type: "league",
        rounds: 1,
        points: { win: 3, draw: 1, loss: 0 },
        tiebreakers: ["goal-difference", "draw-lots"],
        qualified: 4,
      },
      knockoutAfterGroups(4),
    ]);
    const lower = ids("l", 20);
    const season = syntheticSeason(
      world,
      [
        {
          index: 0,
          kind: "league",
          started: true,
          clubIds: lower,
          rounds: Array.from({ length: 19 }, (_, i) => i + 1),
        },
      ],
      roundRobin(lower, 1, (home, away) =>
        Number(home.slice(1)) < Number(away.slice(1)) ? [2, 0] : [0, 2],
      ),
    );
    const qualifiers = stageQualifiers(season, world, 0);
    expect(qualifiers.map((q) => q.clubId)).toEqual(["l1", "l2", "l3", "l4"]);
    expect(qualifiers.every((q) => q.group === undefined && !q.extra)).toBe(true);
    expect(qualifiers.map((q) => q.groupPosition)).toEqual([1, 2, 3, 4]);
  });
});

describe("stageOrigin", () => {
  it("grupo e posição para os N primeiros; extra numerada; undefined para quem não se classificou", () => {
    const world = extrasBank();
    const groups = Object.fromEntries(
      ["A", "B", "C", "D", "E", "F"].map((id) => [id, ids(id.toLowerCase(), 4)]),
    );
    const season = syntheticSeason(
      world,
      [groupsState(0, groups, 1, 3)],
      randomResults(groups, 11),
    );
    const qualifiers = stageQualifiers(season, world, 0);
    const winner = qualifiers.find((q) => q.groupPosition === 1);
    expect(winner).toBeDefined();
    expect(stageOrigin(season, world, 0, winner?.clubId ?? "")).toEqual({
      group: winner?.group,
      position: 1,
    });
    const extras = qualifiers
      .filter((q) => q.extra)
      .sort((x, y) => x.overallPosition - y.overallPosition);
    expect(stageOrigin(season, world, 0, extras[0]?.clubId ?? "")).toEqual({ extra: 1 });
    expect(stageOrigin(season, world, 0, extras[3]?.clubId ?? "")).toEqual({ extra: 4 });
    const out = overallStandings(season, world, 0).find((row) => row.groupPosition === 4);
    expect(stageOrigin(season, world, 0, out?.clubId ?? "")).toBeUndefined();
  });
});
