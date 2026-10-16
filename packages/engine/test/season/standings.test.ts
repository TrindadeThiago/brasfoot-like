import { describe, expect, it } from "vitest";
import type { Tiebreaker } from "../../src/model/catalogs.js";
import type { CompletedBank } from "../../src/model/types.js";
import { standings } from "../../src/season/standings.js";
import { DEFAULT_DISCIPLINE_RULES, type MatchRecord, type Season } from "../../src/season/types.js";

const CLUBS = ["a", "b", "c", "d"];

/** Mundo mínimo: só a competição importa para a tabela. */
function world(tiebreakers: Tiebreaker[], points = { win: 3, draw: 1, loss: 0 }): CompletedBank {
  return {
    competitions: [
      {
        id: "liga",
        countryId: "p",
        name: "Liga",
        format: { type: "league", rounds: 2, points, tiebreakers },
        divisions: [
          { level: 1, name: "D1", clubIds: CLUBS, promotionSlots: 0, relegationSlots: 0 },
        ],
      },
    ],
  } as unknown as CompletedBank;
}

function record(
  round: number,
  home: string,
  away: string,
  h: number,
  a: number,
  reds: [number, number] = [0, 0],
): MatchRecord {
  const stats = (red: number) => ({
    shots: 0,
    shotsOnTarget: 0,
    possession: 50,
    yellowCards: 0,
    redCards: red,
    penalties: 0,
    penaltiesScored: 0,
  });
  return {
    round,
    home,
    away,
    score: { home: h, away: a },
    outcome: "finished",
    events: [],
    stats: { home: stats(reds[0]), away: stats(reds[1]) },
    players: {},
    unavailable: { home: [], away: [] },
  };
}

function season(records: MatchRecord[], seed: string | number = 1): Season {
  return {
    competitionId: "liga",
    divisionLevel: 1,
    seed,
    rules: DEFAULT_DISCIPLINE_RULES,
    clubIds: CLUBS,
    formations: {},
    calendar: [],
    nextRound: 1,
    records,
    status: {},
    warnings: [],
  };
}

const order = (rows: ReturnType<typeof standings>) => rows.map((row) => row.clubId);

describe("tabela (FR-010 a FR-014)", () => {
  it("contabiliza pontos, jogos, V/E/D, gols e saldo", () => {
    const rows = standings(
      season([record(1, "a", "b", 2, 0), record(1, "c", "d", 1, 1), record(2, "b", "c", 3, 1)]),
      world(["wins"]),
    );
    const a = rows.find((row) => row.clubId === "a");
    const b = rows.find((row) => row.clubId === "b");
    expect(a).toMatchObject({
      points: 3,
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDifference: 2,
    });
    expect(b).toMatchObject({
      points: 3,
      played: 2,
      wins: 1,
      losses: 1,
      goalsFor: 3,
      goalsAgainst: 3,
      goalDifference: 0,
    });
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4]);
  });

  it("usa a pontuação do formato da competição", () => {
    const rows = standings(
      season([record(1, "a", "b", 1, 0), record(1, "c", "d", 0, 0)]),
      world(["wins"], { win: 2, draw: 1, loss: 0 }),
    );
    expect(rows.find((row) => row.clubId === "a")?.points).toBe(2);
  });

  it("guarda os 5 últimos resultados, o mais recente por último", () => {
    const records = [
      record(1, "a", "b", 1, 0),
      record(2, "a", "c", 0, 0),
      record(3, "d", "a", 2, 0),
      record(4, "a", "b", 1, 0),
      record(5, "c", "a", 0, 3),
      record(6, "a", "d", 1, 1),
    ];
    expect(
      standings(season(records), world(["wins"])).find((row) => row.clubId === "a")?.form,
    ).toEqual(["D", "L", "W", "W", "D"]);
  });

  it("vitórias", () => {
    // a: 3 pontos com 1 vitória; b: 3 pontos com 3 empates
    const records = [
      record(1, "a", "c", 1, 0),
      record(2, "a", "d", 0, 1),
      record(1, "b", "c", 0, 0),
      record(2, "b", "d", 0, 0),
      record(3, "b", "c", 0, 0),
    ];
    const result = order(standings(season(records), world(["wins"])));
    expect(result.indexOf("a")).toBeLessThan(result.indexOf("b"));
  });

  it("saldo e gols pró", () => {
    const bySaldo = [record(1, "a", "c", 3, 0), record(1, "b", "d", 1, 0)];
    expect(order(standings(season(bySaldo), world(["goal-difference"]))).slice(0, 2)).toEqual([
      "a",
      "b",
    ]);
    const byGoals = [record(1, "a", "c", 3, 2), record(1, "b", "d", 1, 0)];
    expect(
      order(standings(season(byGoals), world(["goal-difference", "goals-for"]))).slice(0, 2),
    ).toEqual(["a", "b"]);
  });

  it("confronto direto entre dois clubes", () => {
    // a e b com 3 pontos; a venceu o confronto direto; b tem saldo melhor
    const records = [
      record(1, "b", "a", 0, 1),
      record(2, "b", "c", 3, 0),
      record(2, "a", "d", 0, 1),
    ];
    const result = order(standings(season(records), world(["head-to-head", "goal-difference"])));
    expect(result.indexOf("a")).toBeLessThan(result.indexOf("b"));
    const bySaldo = order(standings(season(records), world(["goal-difference"])));
    expect(bySaldo.indexOf("b")).toBeLessThan(bySaldo.indexOf("a"));
  });

  it("confronto direto entre três clubes usa a minitabela", () => {
    // a, b e c com 5 pontos; minitabela: a 4, c 2, b 1
    const records = [
      record(1, "a", "b", 1, 0),
      record(2, "a", "c", 0, 0),
      record(3, "b", "c", 0, 0),
      record(4, "a", "d", 0, 0),
      record(5, "b", "d", 1, 0),
      record(6, "d", "b", 0, 0),
      record(7, "c", "d", 1, 0),
    ];
    const rows = standings(season(records), world(["head-to-head", "draw-lots"]));
    expect(order(rows)).toEqual(["a", "c", "b", "d"]);
    expect(rows.slice(0, 3).map((row) => row.points)).toEqual([5, 5, 5]);
  });

  it("menos cartões vermelhos", () => {
    const records = [record(1, "a", "c", 1, 0, [0, 0]), record(1, "b", "d", 1, 0, [2, 0])];
    expect(order(standings(season(records), world(["fewest-red-cards"]))).slice(0, 2)).toEqual([
      "a",
      "b",
    ]);
  });

  it("sorteio é estável na temporada e depende da seed", () => {
    const empty = (seed: number) => order(standings(season([], seed), world(["draw-lots"])));
    expect(empty(1)).toEqual(empty(1));
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => empty(seed).join(",")));
    expect(orders.size).toBeGreaterThan(1);
    const later = order(
      standings(
        season([record(1, "a", "b", 0, 0), record(1, "c", "d", 0, 0)], 1),
        world(["draw-lots"]),
      ),
    );
    expect(later).toEqual(empty(1));
  });

  it("aplica os critérios na ordem do banco", () => {
    // a: saldo +3 com 1 vitória; b: saldo +1 com 1 vitória e mais gols... criar conflito entre critérios
    const records = [record(1, "a", "c", 3, 0), record(1, "b", "d", 4, 3)];
    expect(
      order(standings(season(records), world(["goal-difference", "goals-for"]))).slice(0, 2),
    ).toEqual(["a", "b"]);
    expect(
      order(standings(season(records), world(["goals-for", "goal-difference"]))).slice(0, 2),
    ).toEqual(["b", "a"]);
  });
});
