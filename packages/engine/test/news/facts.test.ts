import { describe, expect, it } from "vitest";
import { expectationOf } from "../../src/board/goals";
import type { MatchEvent } from "../../src/match/types";
import { isComeback, matchFacts, streakOf } from "../../src/news/facts";
import type { NewsContext } from "../../src/news/types";
import type { MatchRecord } from "../../src/season/types";
import { MANAGER, matchOf, newsCareer, playNews, withRecord } from "./helpers";

function contextOf(career: ReturnType<typeof newsCareer>): NewsContext {
  return {
    world: career.world,
    league: career.league,
    news: career.news,
    careerSeed: career.careerSeed,
    managerClubId: MANAGER,
  };
}

function goal(seq: number, side: "home" | "away"): MatchEvent {
  return {
    seq,
    half: 1,
    minute: seq,
    stoppage: 0,
    type: "shot",
    side,
    playerId: "x",
    kind: "open",
    outcome: "goal",
  };
}

describe("fatos de um jogo (014 R3)", () => {
  const played = playNews(newsCareer(), { rounds: 1 });
  const mine = matchOf(played, MANAGER, 1);

  it("resultado do clube do jogador sempre sai", () => {
    const types = matchFacts(contextOf(played), mine).map((fact) => fact.type);
    expect(types).toContain("result");
  });

  it("hat-trick, goleada e virada", () => {
    const scorer = Object.keys(mine.players)[0] as string;
    const edited = withRecord(played, 1, mine.home, (record) => {
      record.score = { home: 5, away: 1 };
      const line = record.players[scorer];
      if (line) line.goals = 3;
      record.events = [goal(1, "away"), ...[2, 3, 4, 5, 6].map((seq) => goal(seq, "home"))];
    });
    const record = matchOf(edited, MANAGER, 1);
    const types = matchFacts(contextOf(edited), record).map((fact) => fact.type);
    expect(types).toEqual(expect.arrayContaining(["hatTrick", "rout", "comeback"]));
    expect(isComeback(record)).toBe(true);
  });

  it("sem virada quando o vencedor nunca esteve atrás", () => {
    const record = { score: { home: 2, away: 0 }, events: [goal(1, "home"), goal(2, "home")] };
    expect(isComeback(record as MatchRecord)).toBe(false);
  });

  it("zebra pela diferença de expectativa", () => {
    const context = contextOf(played);
    const gap = expectationOf(context, mine.home) - expectationOf(context, mine.away);
    const underdogHome = gap > 0;
    const edited = withRecord(played, 1, mine.home, (record) => {
      record.score = underdogHome ? { home: 1, away: 0 } : { home: 0, away: 1 };
    });
    const world = structuredClone(edited.world);
    const competition = world.competitions[0];
    if (competition) competition.news = { upsetGap: 1 };
    const facts = matchFacts({ ...contextOf(edited), world }, matchOf(edited, MANAGER, 1));
    if (gap !== 0) expect(facts.map((fact) => fact.type)).toContain("upset");
  });

  it("clássico entre rivais", () => {
    const world = {
      ...played.world,
      rivalries: [{ clubIds: [mine.home, mine.away] as [string, string], intensity: 2 }],
    };
    const facts = matchFacts({ ...contextOf(played), world }, mine);
    expect(facts.find((fact) => fact.type === "derby")?.vars.intensity).toBe(2);
  });

  it("sequências na temporada", () => {
    const later = playNews(newsCareer(), { rounds: 8 });
    const season = later.league.divisions[0];
    if (!season) throw new Error("sem divisão");
    const streak = streakOf(season, MANAGER, 8);
    expect(streak.length).toBeGreaterThanOrEqual(1);
    expect(["win", "loss", "winless"]).toContain(streak.kind);
  });
});
