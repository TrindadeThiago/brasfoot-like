import { describe, expect, it } from "vitest";
import { createLeagueSeason, divisionSeason } from "../../src/career/league";
import { advanceLeague } from "../../src/career/league-round";
import { seasonTurnover } from "../../src/career/turnover";
import type { LeagueSeason, SeasonHistoryEntry } from "../../src/career/types";
import { competitionId, testWorld } from "./helpers";

// Critérios de aceite da feature 007 (Princípio V): limites declarados aqui.
const SEASONS = 10;
const CLUBS_PER_DIVISION = 20;
const TOTAL_CLUBS = 40;
const SWAPS = 4;

function careerRun(careerSeed: string, roundTrip: boolean) {
  const world = testWorld();
  const created = createLeagueSeason(world, { competitionId: competitionId(), careerSeed });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let league: LeagueSeason = created.league;
  let history: SeasonHistoryEntry[] = [];
  const starts: LeagueSeason[] = [league];
  for (let season = 1; season <= SEASONS; season++) {
    const played = advanceLeague(league, world, { toEnd: true });
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    let finished = played.league;
    if (roundTrip) {
      finished = JSON.parse(JSON.stringify(finished)) as LeagueSeason;
      history = JSON.parse(JSON.stringify(history)) as SeasonHistoryEntry[];
    }
    const turned = seasonTurnover(finished, world, history, { careerSeed });
    if (!turned.ok) throw new Error(JSON.stringify(turned.error));
    league = turned.league;
    history = turned.history;
    starts.push(league);
  }
  return { starts, history };
}

describe(`carreira de ${SEASONS} temporadas sem interação (SC-001 a SC-003)`, () => {
  const run = careerRun("dez-temporadas", false);

  it("toda temporada começa com 20 clubes por divisão e uma partição exata", () => {
    const bank = testWorld().competitions[0]?.divisions.flatMap((division) => division.clubIds);
    for (const league of run.starts) {
      expect(league.divisions).toHaveLength(2);
      for (const season of league.divisions) {
        expect(season.clubIds).toHaveLength(CLUBS_PER_DIVISION);
        expect(season.nextRound).toBe(1);
      }
      const all = league.divisions.flatMap((season) => season.clubIds);
      expect(new Set(all).size).toBe(TOTAL_CLUBS);
      expect([...all].sort()).toEqual([...(bank ?? [])].sort());
    }
  });

  it("rebaixados em N jogam a Série B em N+1 e promovidos jogam a Série A", () => {
    expect(run.history).toHaveLength(SEASONS);
    run.history.forEach((entry, index) => {
      const next = run.starts[index + 1];
      if (!next) throw new Error("sem temporada seguinte");
      const serieA = divisionSeason(next, 1)?.clubIds ?? [];
      const serieB = divisionSeason(next, 2)?.clubIds ?? [];
      const relegated = entry.divisions.find((division) => division.level === 1)?.relegated ?? [];
      const promoted = entry.divisions.find((division) => division.level === 2)?.promoted ?? [];
      expect(relegated).toHaveLength(SWAPS);
      expect(promoted).toHaveLength(SWAPS);
      for (const clubId of relegated) expect(serieB).toContain(clubId);
      for (const clubId of promoted) expect(serieA).toContain(clubId);
      expect(entry.number).toBe(index + 1);
      expect(next.number).toBe(index + 2);
      expect(next.year).toBe(entry.year + 1);
    });
  });

  it("repetir a carreira, com JSON ida e volta entre temporadas, dá o mesmo histórico", () => {
    const again = careerRun("dez-temporadas", true);
    expect(again.history).toEqual(run.history);
    expect(again.starts.at(-1)).toEqual(run.starts.at(-1));
  }, 600_000);
}, 600_000);
