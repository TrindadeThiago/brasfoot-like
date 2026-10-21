import { beforeAll, describe, expect, it } from "vitest";
import { completeCareerDay } from "../../src/career/day";
import { type CareerSeasonState, currentDay } from "../../src/career/season-state";
import { seasonTurnover } from "../../src/career/turnover";
import { annualWageBill } from "../../src/finance/create";
import { fitnessOn } from "../../src/fitness/fitness";
import { DEFAULT_FITNESS } from "../../src/fitness/rules";
import { spearman } from "../../src/season/credibility";
import { MANAGER, newState } from "../career/day-helpers";
import { twoCompetitionsBank } from "../fixtures/two-competitions";

// 017 FR-045 (Princípio V): temporadas completas com duas competições, todos os sistemas e sem
// interação. Limites declarados aqui.
const SEASONS = 10;
// Medido em 2 seeds × 10 temporadas: gols 2,45–2,72; condição média 93,5–95,4 (research.md R15).
const GOALS_PER_MATCH = { min: 2.2, max: 3.0 };
const MIN_MEAN_PREMATCH_FITNESS = 85;
const MAX_ABOVE_MEDIAN_IN_WAGE_BILLS = 4;
const MIN_HEALTHY_SHARE_EACH_SEASON = 0.8;
const MIN_SPEARMAN_REPUTATION_CASH = 0.4;

interface SeasonEnd {
  goalsPerMatch: number;
  matches: number;
  meanFitness: number;
  doubleBooked: number;
  cash: Map<string, number>;
  crisis: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Clubes que aparecem mais de uma vez no mesmo dia do calendário (deve ser nenhum). */
function doubleBookings(state: CareerSeasonState): number {
  let count = 0;
  const seasons = [state.league, ...state.competitions];
  for (const day of state.calendar.days) {
    const clubs: string[] = [];
    for (const slot of day.slots) {
      const season = seasons.find((entry) => entry.competitionId === slot.competitionId);
      for (const division of season?.divisions ?? []) {
        for (const fixture of division.calendar[slot.round - 1]?.fixtures ?? []) {
          clubs.push(fixture.home, fixture.away);
        }
      }
    }
    count += clubs.length - new Set(clubs).size;
  }
  return count;
}

function simulate(seed: string): SeasonEnd[] {
  let state = newState(twoCompetitionsBank(), seed, { systems: true });
  let history = state.board ? [] : [];
  let competitionHistory: never[] = [];
  const ends: SeasonEnd[] = [];
  for (let season = 0; season < SEASONS; season++) {
    const doubleBooked = doubleBookings(state);
    const fitnessSamples: number[] = [];
    while (currentDay(state)) {
      const day = currentDay(state);
      const before = state;
      const done = completeCareerDay(before, seed, MANAGER);
      if (!done.ok) throw new Error(JSON.stringify(done.error));
      state = done.state;
      const date = day?.date as string;
      for (const slot of day?.slots ?? []) {
        const league = [state.league, ...state.competitions].find(
          (entry) => entry.competitionId === slot.competitionId,
        );
        for (const division of league?.divisions ?? []) {
          for (const record of division.records) {
            if (record.round !== slot.round) continue;
            for (const [playerId, line] of Object.entries(record.players)) {
              if (line.minutes <= 0) continue;
              fitnessSamples.push(fitnessOn(before.fitness, playerId, date, DEFAULT_FITNESS));
            }
          }
        }
      }
    }
    const matches = [state.league, ...state.competitions].flatMap((league) =>
      league.divisions.flatMap((division) => division.records),
    );
    const goals = matches.reduce((sum, record) => sum + record.score.home + record.score.away, 0);
    const turned = seasonTurnover(state.league, state.world, history, {
      careerSeed: seed,
      finances: state.finances,
      managerClubId: MANAGER,
      ...(state.renewal ? { renewal: state.renewal } : {}),
      ...(state.market ? { market: state.market } : {}),
      ...(state.board ? { board: state.board } : {}),
      ...(state.fans ? { fans: state.fans } : {}),
      ...(state.news ? { news: state.news } : {}),
      competitions: state.competitions,
      calendar: state.calendar,
      competitionHistory,
    });
    if (!turned.ok || !turned.finances || !turned.competitions || !turned.calendar) {
      throw new Error(JSON.stringify(turned));
    }
    const clubs = Object.values(turned.finances.clubs);
    ends.push({
      goalsPerMatch: goals / matches.length,
      matches: matches.length,
      meanFitness: fitnessSamples.reduce((a, b) => a + b, 0) / fitnessSamples.length,
      doubleBooked,
      cash: new Map(clubs.map((club) => [club.clubId, club.cash])),
      crisis: clubs.filter((club) => club.inCrisis).length,
    });
    history = turned.history as never;
    competitionHistory = turned.competitionHistory as never;
    state = {
      league: turned.league,
      competitions: turned.competitions,
      calendar: turned.calendar,
      fitness: { players: {} },
      finances: turned.finances,
      world: turned.world,
      ...(turned.renewal ? { renewal: turned.renewal } : {}),
      ...(turned.market ? { market: turned.market } : {}),
      ...(turned.board ? { board: turned.board } : {}),
      ...(turned.fans ? { fans: turned.fans } : {}),
      ...(turned.news ? { news: turned.news } : {}),
    };
  }
  return ends;
}

describe.each(["calendario-1", "calendario-2"])(
  `${SEASONS} temporadas com duas competições (%s)`,
  (seed) => {
    const world = twoCompetitionsBank();
    let ends: SeasonEnd[] = [];
    beforeAll(() => {
      ends = simulate(seed);
    }, 1_200_000);

    it("nenhum clube joga duas vezes no mesmo dia em nenhuma temporada", () => {
      expect(ends).toHaveLength(SEASONS);
      for (const end of ends) expect(end.doubleBooked).toBe(0);
    });

    it("joga as duas competições inteiras: 760 jogos da liga e 90 do torneio por temporada", () => {
      for (const end of ends) expect(end.matches).toBe(760 + 90);
    });

    it("placares dentro dos limites", () => {
      for (const end of ends) {
        expect(end.goalsPerMatch).toBeGreaterThanOrEqual(GOALS_PER_MATCH.min);
        expect(end.goalsPerMatch).toBeLessThanOrEqual(GOALS_PER_MATCH.max);
      }
    });

    it(`condição média de quem joga fica acima de ${MIN_MEAN_PREMATCH_FITNESS}`, () => {
      for (const end of ends) {
        expect(end.meanFitness).toBeGreaterThanOrEqual(MIN_MEAN_PREMATCH_FITNESS);
        // O descanso pesa: com jogos no meio da semana, a média fica abaixo de 100.
        expect(end.meanFitness).toBeLessThan(100);
      }
    });

    it("economia dentro dos limites da 008", () => {
      const clubIds = [...(ends[0]?.cash.keys() ?? [])].sort();
      const wages = median(
        clubIds.map((clubId) => annualWageBill(world, clubId, world.manifest.referenceDate)),
      );
      for (const end of ends) {
        const cash = [...end.cash.values()];
        expect(Math.max(...cash) - median(cash)).toBeLessThanOrEqual(
          MAX_ABOVE_MEDIAN_IN_WAGE_BILLS * wages,
        );
        expect(1 - end.crisis / clubIds.length).toBeGreaterThanOrEqual(
          MIN_HEALTHY_SHARE_EACH_SEASON,
        );
      }
      const reputation = clubIds.map(
        (clubId) => world.clubs.find((club) => club.id === clubId)?.reputation ?? 0,
      );
      const meanCash = clubIds.map(
        (clubId) => ends.reduce((sum, end) => sum + (end.cash.get(clubId) ?? 0), 0) / ends.length,
      );
      expect(spearman(reputation, meanCash)).toBeGreaterThanOrEqual(MIN_SPEARMAN_REPUTATION_CASH);
    });
  },
);
