import { describe, expect, it } from "vitest";
import { startLeagueRound } from "../../src/career/league-round";
import { completeCareerRound } from "../../src/finance/round";
import { clinched } from "../../src/news/clinched";
import { createNews } from "../../src/news/create";
import { matchFacts } from "../../src/news/facts";
import { finishRound } from "../../src/season/live-round";
import { MANAGER, matchOf, newsCareer, playNews, withRecord } from "./helpers";

describe("notícias na rodada (014 R2)", () => {
  it("createNews vazio", () => {
    expect(createNews()).toEqual({
      feed: [],
      records: { league: {}, clubs: {} },
      allTime: { players: {} },
      seasons: [],
    });
  });

  it("com notícias a rodada devolve `news`; sem elas nada muda", () => {
    const career = newsCareer();
    const started = startLeagueRound(career.league, career.world);
    if (!started.ok) throw new Error("rodada");
    const run = (withNews: boolean) =>
      completeCareerRound(
        career.league,
        career.finances,
        career.world,
        finishRound(started.round),
        MANAGER,
        undefined,
        undefined,
        undefined,
        undefined,
        withNews ? { state: career.news, careerSeed: career.careerSeed } : undefined,
      );
    const a = run(true);
    const b = run(false);
    if (!a.ok || !b.ok) throw new Error("rodada");
    expect(a.news?.feed).toHaveLength(1);
    const { news: _news, ...rest } = a;
    expect(rest).toEqual(b);
  });
});

describe("contexto (014 US2)", () => {
  it("fim de jejum depois de jogos sem vencer", () => {
    let career = playNews(newsCareer(), { rounds: 8 });
    for (let round = 1; round <= 7; round++) {
      const record = matchOf(career, MANAGER, round);
      career = withRecord(career, round, record.home, (entry) => {
        entry.score = { home: 0, away: 0 };
      });
    }
    const last = matchOf(career, MANAGER, 8);
    career = withRecord(career, 8, last.home, (entry) => {
      entry.score = last.home === MANAGER ? { home: 2, away: 0 } : { home: 0, away: 2 };
    });
    const facts = matchFacts(
      {
        world: career.world,
        league: career.league,
        news: career.news,
        careerSeed: career.careerSeed,
        managerClubId: MANAGER,
      },
      matchOf(career, MANAGER, 8),
    );
    const drought = facts.find((fact) => fact.type === "droughtEnd" && fact.clubIds[0] === MANAGER);
    expect(drought?.vars.drought).toBe(7);
  });
});

describe("matemáticos (014 R3)", () => {
  it("rebaixamento e acesso na última rodada para quem não pode mais mudar de zona", () => {
    const career = playNews(newsCareer(), { toEnd: true });
    const total = career.league.divisions[0]?.calendar.length ?? 0;
    const facts = clinched({ ...career, news: createNews(), managerClubId: MANAGER }, total);
    expect(facts.some((fact) => fact.type === "relegationConfirmed")).toBe(true);
    expect(facts.some((fact) => fact.type === "promotionClinched")).toBe(true);
    const seen = new Set(facts.map((fact) => `${fact.type}:${fact.clubIds[0]}`));
    expect(seen.size).toBe(facts.length);
  });
});
