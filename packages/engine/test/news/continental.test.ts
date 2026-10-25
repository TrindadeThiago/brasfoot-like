import { describe, expect, it } from "vitest";
import { completeCareerDay } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { competitionSeason, currentDay, roundMatches } from "../../src/career/season-state";
import { type ContinentalFacts, continentalFacts } from "../../src/continental/facts";
import { campaignStatuses } from "../../src/continental/status";
import { newsAfterContinental } from "../../src/news/round";
import { newsRules } from "../../src/news/rules";
import type { Headline } from "../../src/news/types";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, continentalLeague } from "../career/continental-helpers";
import { ok } from "../career/qualification-helpers";

/** Joga a temporada dia a dia e junta os fatos que `continentalFacts` vê em cada dia. */
function playFacts(state: CareerSeasonState, seed: string, manager: string) {
  const all: ContinentalFacts = { titles: [], advances: [], eliminations: [], routs: [] };
  const margin = newsRules(state.world, state.league.competitionId).routMargin;
  let current = state;
  for (let day = currentDay(current); day; day = currentDay(current)) {
    const before = current;
    current = ok(completeCareerDay(current, seed, manager)).state;
    for (const slot of day.slots) {
      if (slot.competitionId !== CONTINENTAL_IDS.major) continue;
      const after = competitionSeason(current, slot.competitionId);
      const today = continentalFacts(
        current.world,
        continentalLeague(before).divisions[0] as never,
        after.divisions[0] as never,
        roundMatches(after, slot.round, day.date),
        margin,
      );
      all.titles.push(...today.titles);
      all.advances.push(...today.advances);
      all.eliminations.push(...today.eliminations);
      all.routs.push(...today.routs);
    }
  }
  return { end: current, facts: all, margin };
}

describe("manchetes da competição entre países (022 US2, FR-020)", () => {
  const { state, manager, seed } = compactState({ seed: "continental-noticias" });
  const { end, facts, margin } = playFacts(state, seed, manager);
  const season = continentalLeague(end).divisions[0];

  it("os fatos do dia: um título, 8 avanços, 8 eliminações na fase de pontos e as goleadas", () => {
    expect(facts.titles).toHaveLength(1);
    const statuses = season ? campaignStatuses(end.world, season) : new Map();
    expect(statuses.get(facts.titles[0]?.championId ?? "")).toBe("champion");
    expect(facts.advances).toHaveLength(8);
    expect(new Set(facts.advances.map((entry) => entry.clubId)).size).toBe(8);
    expect(facts.eliminations).toHaveLength(8);
    const advanced = new Set(facts.advances.map((entry) => entry.clubId));
    expect(facts.eliminations.every((entry) => !advanced.has(entry.clubId))).toBe(true);
    const routs = (season?.records ?? []).filter(
      (record) => Math.abs(record.score.home - record.score.away) >= margin,
    );
    expect(facts.routs).toHaveLength(routs.length);
  });

  it("cada fato vira uma manchete só com tipo e variáveis, e o avanço e a eliminação são do técnico", () => {
    const news = newsAfterContinental(
      {
        world: end.world,
        league: end.league,
        news: end.news as never,
        careerSeed: seed,
        managerClubId: manager,
      },
      facts,
      99,
    );
    const headlines = (news.feed.find((feed) => feed.round === 99)?.headlines ?? []) as Headline[];
    const types = new Set(headlines.map((headline) => headline.type));
    expect(types.has("continentalChampion")).toBe(true);
    const mine = headlines.filter((headline) => headline.mine);
    for (const headline of headlines) {
      expect("text" in headline).toBe(false);
      expect(headline.variant).toBeGreaterThanOrEqual(0);
      expect(headline.variant).toBeLessThan(3);
      if (headline.type === "continentalAdvanced" || headline.type === "continentalEliminated") {
        expect(headline.vars.club).toBe(manager);
      }
    }
    const status = season ? campaignStatuses(end.world, season).get(manager) : undefined;
    const advanced = facts.advances.some((entry) => entry.clubId === manager);
    const out = facts.eliminations.some((entry) => entry.clubId === manager);
    expect(advanced || out || status !== undefined).toBe(true);
    if (advanced)
      expect(mine.some((headline) => headline.type === "continentalAdvanced")).toBe(true);
    if (out) expect(mine.some((headline) => headline.type === "continentalEliminated")).toBe(true);
    const champion = headlines.find((headline) => headline.type === "continentalChampion");
    expect(champion?.vars.club).toBe(facts.titles[0]?.championId);
    expect(champion?.vars.opponent).toBe(facts.titles[0]?.runnerUpId);
    expect(champion?.vars.competition).toBe(CONTINENTAL_IDS.major);
  });

  it("a variação do texto é determinística", () => {
    const run = () =>
      newsAfterContinental(
        {
          world: end.world,
          league: end.league,
          news: end.news as never,
          careerSeed: seed,
          managerClubId: manager,
        },
        facts,
        99,
      )
        .feed.find((feed) => feed.round === 99)
        ?.headlines.map((headline) => [headline.id, headline.variant]);
    expect(run()).toEqual(run());
  });

  it("a carreira registra a manchete do campeão no feed da temporada", () => {
    const champions = (end.news?.feed ?? []).flatMap((feed) =>
      feed.headlines.filter(
        (headline) =>
          headline.type === "continentalChampion" &&
          headline.vars.competition === CONTINENTAL_IDS.major,
      ),
    );
    expect(champions).toHaveLength(1);
    expect(champions[0]?.vars.club).toBe(facts.titles[0]?.championId);
  });
});
