import { describe, expect, it } from "vitest";
import { createNews } from "../../src/news/create";
import { updateRecords } from "../../src/news/records";
import { newsAfterRound } from "../../src/news/round";
import { MANAGER, matchOf, newsCareer, playNews, withRecord } from "./helpers";

const entry = (value: number, extra: Record<string, unknown> = {}) => ({
  value,
  season: 1,
  year: 2027,
  ...extra,
});

describe("recordes (014 R5, critério de aceite 2, SC-002)", () => {
  it("primeira marca só registra; superar gera manchete com o anterior; empatar não conta", () => {
    const empty = createNews().records;
    const first = updateRecords(empty, [
      {
        scope: "club",
        kind: "biggestWin",
        owner: "a",
        entry: entry(3, { clubId: "a", opponentId: "b", score: [3, 0] }),
      },
    ]);
    expect(first.broken).toEqual([]);
    const tie = updateRecords(first.records, [
      {
        scope: "club",
        kind: "biggestWin",
        owner: "a",
        entry: entry(3, { clubId: "a", opponentId: "c", score: [3, 0], year: 2030 }),
      },
    ]);
    expect(tie.broken).toEqual([]);
    expect(tie.records.clubs.a?.biggestWin?.opponentId).toBe("b");
    const beaten = updateRecords(first.records, [
      {
        scope: "club",
        kind: "biggestWin",
        owner: "a",
        entry: entry(5, { clubId: "a", opponentId: "d", score: [5, 0], year: 2031 }),
      },
    ]);
    expect(beaten.broken).toHaveLength(1);
    expect(beaten.broken[0]?.vars).toMatchObject({
      kind: "biggestWin",
      newValue: 5,
      newOpponent: "d",
      prevValue: 3,
      prevOpponent: "b",
      prevYear: 2027,
      prevGoalsFor: 3,
      prevGoalsAgainst: 0,
    });
  });

  it("o mesmo artilheiro passando o próprio recorde na temporada não repete manchete", () => {
    const records = updateRecords(createNews().records, [
      { scope: "league", kind: "mostPlayerGoalsSeason", entry: entry(10, { playerId: "p" }) },
    ]).records;
    const again = updateRecords(records, [
      {
        scope: "league",
        kind: "mostPlayerGoalsSeason",
        entry: entry(11, { playerId: "p" }),
        sameHolder: (previous) => previous.playerId === "p" && previous.season === 1,
      },
    ]);
    expect(again.broken).toEqual([]);
    expect(again.records.league.mostPlayerGoalsSeason?.value).toBe(11);
  });

  it("na rodada: maior goleada do clube cita o recorde anterior", () => {
    let career = playNews(newsCareer(), { rounds: 2 });
    const first = matchOf(career, MANAGER, 1);
    const own = first.home === MANAGER ? "home" : "away";
    career = withRecord(career, 1, first.home, (record) => {
      record.score = own === "home" ? { home: 2, away: 0 } : { home: 0, away: 2 };
    });
    const base = {
      world: career.world,
      league: career.league,
      careerSeed: career.careerSeed,
      managerClubId: MANAGER,
    };
    const afterFirst = newsAfterRound({ ...base, news: createNews() }, 1);
    expect(afterFirst.records.clubs[MANAGER]?.biggestWin?.value).toBe(2);
    const second = matchOf(career, MANAGER, 2);
    const side = second.home === MANAGER ? "home" : "away";
    const edited = withRecord(career, 2, second.home, (record) => {
      record.score = side === "home" ? { home: 6, away: 0 } : { home: 0, away: 6 };
    });
    const news = newsAfterRound({ ...base, league: edited.league, news: afterFirst }, 2);
    const headline = news.feed
      .at(-1)
      ?.headlines.find(
        (item) =>
          item.type === "record" && item.vars.kind === "biggestWin" && item.vars.scope === "club",
      );
    expect(headline?.vars).toMatchObject({ prevValue: 2, newValue: 6, owner: MANAGER });
    expect(headline?.mine).toBe(true);
  });
});
