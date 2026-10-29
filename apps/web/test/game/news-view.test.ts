// 029 R5 a R8: competição de cada manchete, grupos com contagem, filtros e rodadas vizinhas.
import { HEADLINE_TYPES, type Headline, type RoundFeed } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import {
  COMPETITION_TYPES,
  filterHeadlines,
  GENERAL_TYPES,
  groupHeadlines,
  headlineCompetition,
  LEAGUE_TYPES,
  roundNav,
} from "../../src/game/news-view";
import { storedCareer } from "../helpers/career";

let counter = 0;
function headline(overrides: Partial<Headline> = {}): Headline {
  counter += 1;
  return {
    id: `h-${counter}`,
    type: "result",
    relevance: 50,
    variant: 0,
    clubIds: [],
    vars: {},
    mine: false,
    ...overrides,
  };
}

async function world() {
  const { save } = await storedCareer(6);
  const other = save.bank.competitions.find((entry) => entry.id !== save.league.competitionId);
  return { save, other: other?.id ?? "outra-competicao" };
}

describe("manchetes por competição (029)", () => {
  it("todo tipo de manchete está classificado em exatamente um dos três grupos", () => {
    const all = [...LEAGUE_TYPES, ...COMPETITION_TYPES, ...GENERAL_TYPES].sort();
    expect(all).toEqual([...HEADLINE_TYPES].sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it("a competição vem de vars.competition; sem ela, os fatos da liga usam a liga principal e os de pessoas, nenhuma", async () => {
    const { save, other } = await world();
    expect(
      headlineCompetition(save, headline({ type: "cupUpset", vars: { competition: other } })),
    ).toBe(other);
    expect(headlineCompetition(save, headline({ type: "rout" }))).toBe(save.league.competitionId);
    expect(headlineCompetition(save, headline({ type: "coachFired" }))).toBeUndefined();
    expect(headlineCompetition(save, headline({ type: "bigTransfer" }))).toBeUndefined();
  });

  it("agrupa em 'seu clube', uma seção por competição na ordem do banco e 'geral'; a manchete do clube entra nas duas", async () => {
    const { save, other } = await world();
    const league = save.league.competitionId;
    const items = [
      headline({ type: "rout", mine: true }),
      headline({ type: "cupUpset", vars: { competition: other } }),
      headline({ type: "result" }),
      headline({ type: "coachHired" }),
    ];
    const groups = groupHeadlines(save, items);
    expect(groups[0]?.kind).toBe("mine");
    expect(groups[0]?.headlines).toHaveLength(1);
    const competitions = groups.filter((group) => group.kind === "competition");
    // Na ordem do banco; as competições que o banco não conhece vêm depois.
    const order = save.bank.competitions.map((entry) => entry.id);
    const expected = [league, other].sort((a, b) => {
      const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
      return rank(a) - rank(b);
    });
    expect(competitions.map((group) => group.id)).toEqual(expected);
    expect(competitions.find((group) => group.id === league)?.headlines).toHaveLength(2);
    expect(groups.at(-1)?.kind).toBe("general");
    expect(groups.at(-1)?.headlines).toHaveLength(1);
    // A contagem de cada seção é o tamanho da sua lista.
    for (const group of groups) expect(group.headlines.length).toBeGreaterThan(0);
  });

  it("não cria seção vazia: sem manchete do clube nem geral, só as competições", async () => {
    const { save } = await world();
    const groups = groupHeadlines(save, [headline({ type: "result" })]);
    expect(groups.map((group) => group.kind)).toEqual(["competition"]);
    expect(groupHeadlines(save, [])).toEqual([]);
  });

  it("os filtros: Do meu clube, por competição e os dois juntos", async () => {
    const { save, other } = await world();
    const items = [
      headline({ type: "rout", mine: true }),
      headline({ type: "cupUpset", vars: { competition: other }, mine: true }),
      headline({ type: "result" }),
      headline({ type: "coachHired" }),
    ];
    expect(filterHeadlines(save, items, { scope: "all" })).toHaveLength(4);
    expect(filterHeadlines(save, items, { scope: "mine" })).toHaveLength(2);
    expect(filterHeadlines(save, items, { scope: "all", competition: other })).toHaveLength(1);
    expect(
      filterHeadlines(save, items, { scope: "mine", competition: save.league.competitionId }),
    ).toHaveLength(1);
    expect(filterHeadlines(save, items, { scope: "all", competition: "general" })).toHaveLength(1);
  });

  it("as rodadas vizinhas: sem anterior na primeira e sem próxima na última", () => {
    const feed = [0, 1, 2].map(
      (round): RoundFeed => ({ season: 1, year: 2027, round, headlines: [] }),
    );
    expect(roundNav(feed, { season: 1, round: 0 })).toEqual({ previous: undefined, next: feed[1] });
    expect(roundNav(feed, { season: 1, round: 1 })).toEqual({ previous: feed[0], next: feed[2] });
    expect(roundNav(feed, { season: 1, round: 2 })).toEqual({ previous: feed[1], next: undefined });
    expect(roundNav(feed, { season: 9, round: 9 })).toEqual({
      previous: undefined,
      next: undefined,
    });
  });
});
