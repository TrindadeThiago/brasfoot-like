import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { divisionSeason, leagueSeasonSeed } from "../../src/career/league";
import { seasonTurnover, TURNOVER_STEP_IDS } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { standings } from "../../src/season/standings";
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
      "advance-year",
      "reset-season-stats",
      "generate-calendars",
      "pay-sponsorship",
      "ai-finance-review",
      "reset-market",
    ]);
  });
});
