import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { advanceCareerDays } from "../../src/career/day";
import { divisionSeason, leagueSeasonSeed } from "../../src/career/league";
import type { CareerSeasonState } from "../../src/career/season-state";
import { seasonTurnover, TURNOVER_STEP_IDS } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { initialRenewal } from "../../src/renewal/measure";
import { standings } from "../../src/season/standings";
import { CUP_ID, cupBank } from "../fixtures/cup-bank";
import { TOURNAMENT_ID, twoCompetitionsBank } from "../fixtures/two-competitions";
import { MANAGER, newState } from "./day-helpers";
import { newLeague, playedLeague, testWorld } from "./helpers";

const SEED = "virada";

function turned(league: LeagueSeason, history: SeasonHistoryEntry[] = []) {
  const result = seasonTurnover(league, testWorld(), history, { careerSeed: SEED });
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result;
}

/** Liga encerrada com um lesionado e um suspenso na Série A. */
function finishedWithStatus(): LeagueSeason {
  const league = structuredClone(playedLeague(SEED));
  const serieA = league.divisions[0];
  if (!serieA) throw new Error("sem Série A");
  const [injured, suspended, booked] = testWorld()
    .players.filter((player) => player.clubId === serieA.clubIds[0])
    .map((player) => player.id);
  serieA.status[injured as string] = { yellows: 1, suspension: 0, injury: 3 };
  serieA.status[suspended as string] = { yellows: 0, suspension: 2, injury: 0 };
  serieA.status[booked as string] = { yellows: 2, suspension: 0, injury: 0 };
  return league;
}

describe("virada de temporada (R5–R8, FR-010 a FR-016)", () => {
  it("recusa temporada não encerrada", () => {
    const result = seasonTurnover(newLeague(SEED), testWorld(), [], { careerSeed: SEED });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ code: "turnover.season_not_over", params: { round: 1 } });
  });

  it("cria a temporada seguinte com acesso/rebaixamento, ano + 1 e calendários novos", () => {
    const finished = playedLeague(SEED);
    const { league } = turned(finished);
    expect(league.number).toBe(2);
    expect(league.year).toBe(finished.year + 1);
    expect(league.seed).toBe(leagueSeasonSeed(SEED, 2));
    expect(league.competitionId).toBe(finished.competitionId);
    const expected = nextComposition(finished, testWorld()).composition;
    for (const season of league.divisions) {
      expect(season.seed).toBe(league.seed);
      expect(season.nextRound).toBe(1);
      expect(season.records).toEqual([]);
      expect(season.warnings).toEqual([]);
      expect([...season.clubIds].sort()).toEqual(expected[season.divisionLevel]);
      expect(season.calendar).toHaveLength(38);
      for (const round of season.calendar) {
        const clubs = round.fixtures.flatMap((fixture) => [fixture.home, fixture.away]);
        expect(new Set(clubs).size).toBe(20);
      }
    }
    const before = divisionSeason(finished, 1)?.calendar[0]?.fixtures;
    const after = divisionSeason(league, 1)?.calendar[0]?.fixtures;
    expect(after).not.toEqual(before);
  }, 30000);

  it("zera amarelos e suspensões e mantém só as lesões restantes", () => {
    const finished = finishedWithStatus();
    const snapshot = JSON.stringify(finished);
    const { league } = turned(finished);
    const before = Object.assign(
      {},
      ...finished.divisions.map((season) => season.status),
    ) as Record<string, { yellows: number; suspension: number; injury: number }>;
    const after = Object.assign({}, ...league.divisions.map((season) => season.status));
    const expected = Object.fromEntries(
      Object.entries(before)
        .filter(([, entry]) => entry.injury > 0)
        .map(([id, entry]) => [id, { yellows: 0, suspension: 0, injury: entry.injury }]),
    );
    expect(after).toEqual(expected);
    const clubId = finished.divisions[0]?.clubIds[0];
    const [injured, suspended, booked] = testWorld()
      .players.filter((player) => player.clubId === clubId)
      .map((player) => player.id);
    expect(after[injured as string]).toEqual({ yellows: 0, suspension: 0, injury: 3 });
    expect(after[suspended as string]).toBeUndefined();
    expect(after[booked as string]).toBeUndefined();
    expect(JSON.stringify(finished)).toBe(snapshot);
  }, 30000);

  it("registra o histórico com campeões, classificações e quem subiu e desceu", () => {
    const finished = playedLeague(SEED);
    const { history } = turned(finished);
    expect(history).toHaveLength(1);
    const entry = history[0];
    expect(entry).toMatchObject({
      number: 1,
      year: finished.year,
      competitionId: finished.competitionId,
    });
    const moves = nextComposition(finished, testWorld());
    for (const level of [1, 2]) {
      const division = entry?.divisions.find((item) => item.level === level);
      const season = divisionSeason(finished, level);
      if (!division || !season) throw new Error("sem divisão");
      const table = standings(season, testWorld());
      expect(division.championId).toBe(table[0]?.clubId);
      expect(division.standings).toEqual(
        table.map(
          ({ position, clubId, points, played, wins, draws, losses, goalsFor, goalsAgainst }) => ({
            position,
            clubId,
            points,
            played,
            wins,
            draws,
            losses,
            goalsFor,
            goalsAgainst,
          }),
        ),
      );
      expect(division.promoted).toEqual(moves.promoted[level]);
      expect(division.relegated).toEqual(moves.relegated[level]);
    }
  }, 30000);

  it("acumula o histórico sem alterar a entrada", () => {
    const finished = playedLeague(SEED);
    const snapshot = JSON.stringify(finished);
    const previous: SeasonHistoryEntry[] = [
      { number: 0, year: 1999, competitionId: finished.competitionId, divisions: [] },
    ];
    const { history } = turned(finished, previous);
    expect(history).toHaveLength(2);
    expect(history[0]).toBe(previous[0]);
    expect(previous).toHaveLength(1);
    expect(JSON.stringify(finished)).toBe(snapshot);
  }, 30000);

  it("é determinística, inclusive depois de JSON ida e volta", () => {
    const finished = playedLeague(SEED);
    const first = turned(finished);
    const again = turned(finished);
    const roundTrip = turned(JSON.parse(JSON.stringify(finished)) as LeagueSeason);
    expect(again).toEqual(first);
    expect(roundTrip).toEqual(first);
  }, 30000);

  it("as etapas padrão têm ids e ordem estáveis", () => {
    expect(TURNOVER_STEP_IDS).toEqual([
      "record-history",
      "fans-new-season",
      "news-new-season",
      "pay-prizes",
      "close-finance-season",
      "return-loans",
      "evolve-players",
      "retire-players",
      "expire-contracts",
      "regulate-world",
      "generate-youth",
      "balance-squads",
      "age-out-free-agents",
      "promotion-relegation",
      "resolve-qualification",
      "news-qualification",
      "advance-year",
      "reset-season-stats",
      "generate-calendars",
      "pay-sponsorship",
      "ai-finance-review",
      "reset-market",
      "board-new-season",
    ]);
  });
});

describe("virada com outras competições (017 R11, FR-034)", () => {
  const SEED = "virada-duas";
  const world = twoCompetitionsBank();

  function finishedState() {
    const played = advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER);
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    return played.state;
  }

  function turn(state: CareerSeasonState) {
    return seasonTurnover(state.league, state.world, [], {
      careerSeed: SEED,
      competitions: state.competitions,
      calendar: state.calendar,
      competitionHistory: [],
    });
  }

  it("cria a nova temporada de cada competição e o calendário do ano seguinte", () => {
    const result = turn(finishedState());
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.league.number).toBe(2);
    expect(result.competitions).toHaveLength(1);
    const cup = result.competitions?.[0];
    expect(cup?.competitionId).toBe(TOURNAMENT_ID);
    expect(cup?.number).toBe(2);
    expect(cup?.divisions[0]?.nextRound).toBe(1);
    expect(cup?.divisions[0]?.records).toEqual([]);
    expect(cup?.divisions[0]?.clubIds).toHaveLength(10);
    expect(result.calendar?.start).toBe("2028-01-01");
    expect(result.calendar?.days.flatMap((day) => day.slots)).toHaveLength(38 + 18);
  });

  it("guarda o histórico do torneio sem mexer no da liga", () => {
    const state = finishedState();
    const result = turn(state);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.history).toHaveLength(1);
    expect(result.history[0]?.competitionId).toBe(state.league.competitionId);
    expect(result.competitionHistory).toHaveLength(1);
    const entry = result.competitionHistory?.[0];
    expect(entry?.competitionId).toBe(TOURNAMENT_ID);
    expect(entry?.divisions[0]?.standings).toHaveLength(10);
    expect(entry?.divisions[0]?.championId).toBe(entry?.divisions[0]?.standings[0]?.clubId);
  });

  it("os jogos do torneio entram na evolução do fim da temporada (depois do meio do ano)", () => {
    const state = finishedState();
    const withSystems = { ...state, renewal: initialRenewal(state.world) };
    const result = seasonTurnover(withSystems.league, withSystems.world, [], {
      careerSeed: SEED,
      renewal: withSystems.renewal,
      competitions: state.competitions,
      calendar: state.calendar,
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const cupPlayer = state.world.players.find((player) => player.clubId === "clube-001");
    const minutes = result.renewal?.lastEvolution?.minutes[cupPlayer?.id ?? ""] ?? 0;
    const leagueOnly = seasonTurnover(withSystems.league, withSystems.world, [], {
      careerSeed: SEED,
      renewal: withSystems.renewal,
    });
    if (!leagueOnly.ok) throw new Error("falhou");
    expect(minutes).toBeGreaterThan(
      leagueOnly.renewal?.lastEvolution?.minutes[cupPlayer?.id ?? ""] ?? 0,
    );
  }, 120_000);

  it("é determinística", () => {
    const state = finishedState();
    expect(turn(state)).toEqual(turn(state));
  }, 120_000);
});

describe("virada com a copa (018 R11)", () => {
  const SEED = "virada-copa";
  const world = cupBank();

  function finished() {
    const played = advanceCareerDays(newState(world, SEED), { toEnd: true }, SEED, MANAGER);
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    return played.state;
  }

  it("registra a edição no histórico de copas e cria a nova, sorteada e zerada", () => {
    const state = finished();
    const result = seasonTurnover(state.league, state.world, [], {
      careerSeed: SEED,
      competitions: state.competitions,
      calendar: state.calendar,
      competitionHistory: [],
      cupHistory: [],
    });
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.cupHistory).toHaveLength(1);
    const entry = result.cupHistory?.[0];
    expect(entry?.competitionId).toBe(CUP_ID);
    expect(entry?.championId).not.toBe(entry?.runnerUpId);
    expect(entry?.final.decidedBy).toBeDefined();
    expect(Object.keys(entry?.reached ?? {})).toHaveLength(16);
    // A copa não entra no histórico de ligas.
    expect(result.competitionHistory).toEqual([]);
    const next = result.competitions?.find((league) => league.competitionId === CUP_ID);
    expect(next?.number).toBe(2);
    const cup = next?.divisions[0];
    expect(cup?.records).toEqual([]);
    expect(cup?.nextRound).toBe(1);
    expect(cup?.bracket?.phases[0]?.drawn).toBe(true);
    expect(cup?.bracket?.phases[1]?.drawn).toBe(false);
    expect(result.calendar?.start).toBe("2028-01-01");
  }, 120_000);
});
