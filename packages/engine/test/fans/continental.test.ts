import { describe, expect, it } from "vitest";
import { leagueRound } from "../../src/career/league";
import type { CareerSeasonState } from "../../src/career/season-state";
import { fansAfterContinentalTitle, fansAfterExtraMatches, moodChange } from "../../src/fans/mood";
import { rivalryOf } from "../../src/fans/rivalries";
import type { FansContext, FansState } from "../../src/fans/types";
import type { CompletedBank } from "../../src/model/types";
import type { MatchRecord } from "../../src/season/types";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, continentalLeague, playDays } from "../career/continental-helpers";

type FansRules = NonNullable<CompletedBank["competitions"][number]["fans"]>;

/** O mundo com as regras de torcida dadas em todas as ligas principais. */
function withFans(world: CompletedBank, fans: FansRules): CompletedBank {
  return {
    ...world,
    competitions: world.competitions.map((competition) =>
      competition.countryId === undefined ? competition : { ...competition, fans },
    ),
  } as CompletedBank;
}

/** Sem nada específico da competição entre países: o padrão do motor. */
const NEUTRAL: FansRules = {
  continentalMatchPct: 100,
  continentalExpectation: 0,
  continentalTitle: 0,
};

/** Humor 50 em todos os clubes, para os testes não esbarrarem nos limites 0 e 100. */
function calm(fans: FansState): FansState {
  return {
    clubs: Object.fromEntries(
      Object.entries(fans.clubs).map(([id, club]) => [id, { ...club, mood: 50 }]),
    ),
  };
}

function contextOf(state: CareerSeasonState, rules: FansRules): FansContext {
  return {
    world: withFans(state.world, rules),
    league: state.league,
    finances: state.finances,
    fans: calm(state.fans as FansState),
  };
}

/** Jogo da taça em que o mandante vence por 2 a 0. */
function homeWin(home: string, away: string, competitionId: string = CONTINENTAL_IDS.major) {
  return {
    competitionId,
    record: {
      round: 1,
      home,
      away,
      score: { home: 2, away: 0 },
      outcome: "finished",
      events: [],
      players: {},
      unavailable: { home: [], away: [] },
    } as unknown as MatchRecord,
  };
}

describe("torcida na competição entre países (022 US2, FR-019)", () => {
  const { state, manager, seed } = compactState({ seed: "continental-torcida" });
  const participants = continentalLeague(state).divisions[0]?.clubIds ?? [];
  // Dois participantes que não são rivais, para o peso de clássico não entrar na conta.
  const pair = participants
    .flatMap((a) => participants.map((b) => [a, b] as const))
    .find(([a, b]) => a !== b && !rivalryOf(state.world, a, b));
  const [home, away] = pair ?? ["", ""];
  const mood = (fans: FansState, id: string) => fans.clubs[id]?.mood ?? 50;

  it("o jogo da taça pesa o percentual declarado; sem regra o peso é o da liga", () => {
    expect(pair).toBeDefined();
    const plain = fansAfterExtraMatches(
      contextOf(state, NEUTRAL),
      [homeWin(home, away)],
      1,
      manager,
    );
    const heavy = fansAfterExtraMatches(
      contextOf(state, { ...NEUTRAL, continentalMatchPct: 150 }),
      [homeWin(home, away)],
      1,
      manager,
    );
    expect(mood(plain, home)).toBe(54);
    expect(mood(plain, away)).toBe(46);
    expect(mood(heavy, home)).toBe(56);
    expect(mood(heavy, away)).toBe(44);
  });

  it("um jogo de competição nacional não muda de peso com a regra", () => {
    const national = homeWin(home, away, state.league.competitionId);
    const normal = fansAfterExtraMatches(contextOf(state, NEUTRAL), [national], 1, manager);
    const heavy = fansAfterExtraMatches(
      contextOf(state, { ...NEUTRAL, continentalMatchPct: 150 }),
      [national],
      1,
      manager,
    );
    expect(mood(heavy, home)).toBe(mood(normal, home));
    expect(mood(heavy, away)).toBe(mood(normal, away));
  });

  it("participar da competição aumenta a expectativa do ano", () => {
    const middle = playDays(state, 10, seed, manager);
    const round = leagueRound(middle.league) - 1;
    expect(round).toBeGreaterThanOrEqual(5);
    const clubs = continentalLeague(middle).divisions[0]?.clubIds ?? [];
    const inLeague = clubs.filter((id) =>
      middle.league.divisions.some((season) => season.clubIds.includes(id)),
    );
    expect(inLeague.length).toBeGreaterThan(0);
    const amount = (rules: FansRules, clubId: string) =>
      moodChange(
        { ...contextOf(middle, rules), fans: middle.fans as FansState },
        clubId,
        round,
      ).factors.find(
        (factor) => factor.kind === "aheadOfExpectation" || factor.kind === "belowExpectation",
      )?.amount ?? 0;
    const boost: FansRules = { ...NEUTRAL, continentalExpectation: 4 };
    const plain = inLeague.map((id) => amount(NEUTRAL, id));
    const boosted = inLeague.map((id) => amount(boost, id));
    for (const [index, value] of boosted.entries()) {
      expect(value).toBeLessThanOrEqual(plain[index] as number);
    }
    expect(boosted.some((value, index) => value < (plain[index] as number))).toBe(true);
    // Quem não disputa a taça não muda.
    const international = new Set(
      middle.world.competitions
        .filter((competition) => competition.countryId === undefined)
        .flatMap((competition) => competition.divisions.flatMap((division) => division.clubIds)),
    );
    const outsider = middle.league.divisions
      .flatMap((season) => season.clubIds)
      .find((id) => !international.has(id));
    expect(outsider).toBeDefined();
    expect(amount(boost, outsider as string)).toBe(amount(NEUTRAL, outsider as string));
  });

  it("o título anima a torcida do campeão e o padrão não muda o humor", () => {
    const base = fansAfterContinentalTitle(
      contextOf(state, NEUTRAL),
      [{ championId: home }],
      1,
      manager,
    );
    expect(mood(base, home)).toBe(50);
    const lively = fansAfterContinentalTitle(
      contextOf(state, { ...NEUTRAL, continentalTitle: 20 }),
      [{ championId: home }],
      1,
      manager,
    );
    expect(mood(lively, home)).toBe(70);
    expect(mood(lively, away)).toBe(50);
  });
});
