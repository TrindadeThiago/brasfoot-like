import { beforeAll, describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import type { CareerSeasonState } from "../../src/career/season-state";
import { seasonTurnover } from "../../src/career/turnover";
import type { TurnoverResult } from "../../src/career/types";
import { SQUAD_RULES } from "../../src/renewal/rules";
import { isCountryMain } from "../../src/world/countries";
import { clubOfCountry, worldBank, worldState } from "./world-helpers";

const SEED = "mundo-virada";
type Done = Extract<TurnoverResult, { ok: true }>;

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("virada de temporada de vários países (020 R6)", () => {
  const world = worldBank();
  const manager = clubOfCountry(world, 1);
  let end: CareerSeasonState;
  let turned: Done;

  beforeAll(() => {
    end = ok(
      advanceCareerDays(worldState(world, SEED, manager), { toEnd: true }, SEED, manager),
    ).state;
    turned = ok(
      seasonTurnover(end.league, end.world, [], {
        careerSeed: SEED,
        finances: end.finances,
        managerClubId: manager,
        ...(end.renewal ? { renewal: end.renewal } : {}),
        ...(end.market ? { market: end.market } : {}),
        ...(end.board ? { board: end.board } : {}),
        ...(end.fans ? { fans: end.fans } : {}),
        ...(end.news ? { news: end.news } : {}),
        competitions: end.competitions,
        calendar: end.calendar,
      }),
    );
  }, 120_000);

  it("todos os países viram: nova temporada de todas as competições, a em foco continua a mesma", () => {
    expect(turned.league.competitionId).toBe(end.league.competitionId);
    expect(turned.league.number).toBe(2);
    const ids = [turned.league, ...(turned.competitions ?? [])].map((entry) => entry.competitionId);
    expect(ids.sort()).toEqual(world.competitions.map((entry) => entry.id).sort());
    for (const league of [turned.league, ...(turned.competitions ?? [])]) {
      expect(league.number).toBe(2);
      expect(league.divisions.every((season) => season.nextRound === 1)).toBe(true);
    }
  });

  it("cada país tem acesso e rebaixamento próprios e nenhum clube em duas divisões", () => {
    for (const league of [turned.league, ...(turned.competitions ?? [])]) {
      const before = [end.league, ...end.competitions].find(
        (e) => e.competitionId === league.competitionId,
      );
      const clubsBefore = before?.divisions.flatMap((season) => season.clubIds).sort() ?? [];
      const clubsAfter = league.divisions.flatMap((season) => season.clubIds).sort();
      expect(clubsAfter).toEqual(clubsBefore);
      expect(new Set(clubsAfter).size).toBe(clubsAfter.length);
    }
    for (const league of [turned.league, ...(turned.competitions ?? [])].filter((entry) =>
      isCountryMain(world, entry.competitionId),
    )) {
      const before = [end.league, ...end.competitions].find(
        (e) => e.competitionId === league.competitionId,
      );
      const top = (l: typeof league | undefined) =>
        [...(l?.divisions.find((season) => season.divisionLevel === 1)?.clubIds ?? [])]
          .sort()
          .join();
      expect(top(league), league.competitionId).not.toBe(top(before));
    }
  });

  it("o histórico guarda o campeão de cada país", () => {
    const champions = [...turned.history, ...(turned.competitionHistory ?? [])].filter((entry) =>
      isCountryMain(world, entry.competitionId),
    );
    expect(champions).toHaveLength(3);
    for (const entry of champions) {
      expect(entry.divisions.every((division) => division.championId.length > 0)).toBe(true);
    }
  });

  it("o histórico de cada país guarda a classificação final e os 10 maiores artilheiros", () => {
    const entries = [...turned.history, ...(turned.competitionHistory ?? [])].filter((entry) =>
      isCountryMain(world, entry.competitionId),
    );
    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      for (const division of entry.divisions) {
        expect(division.standings).toHaveLength(10);
        const scorers = division.topScorers ?? [];
        expect(scorers.length).toBeGreaterThan(0);
        expect(scorers.length).toBeLessThanOrEqual(10);
        const goals = scorers.map((scorer) => scorer.goals);
        expect(goals).toEqual([...goals].sort((a, b) => b - a));
        const clubs = new Set(division.standings.map((row) => row.clubId));
        expect(scorers.every((scorer) => clubs.has(scorer.clubId))).toBe(true);
      }
    }
  });

  it("elencos, finanças, diretoria e torcida cobrem os clubes de todos os países", () => {
    for (const club of world.clubs) {
      const squad = turned.world.players.filter((player) => player.clubId === club.id);
      expect(squad.length, club.id).toBeGreaterThanOrEqual(SQUAD_RULES.min);
      expect(squad.length, club.id).toBeLessThanOrEqual(SQUAD_RULES.userMax);
      expect(turned.finances?.clubs[club.id], club.id).toBeDefined();
      expect(turned.board?.clubs[club.id], club.id).toBeDefined();
      expect(turned.fans?.clubs[club.id], club.id).toBeDefined();
    }
    const summaries = new Set(turned.finances?.seasons.map((summary) => summary.clubId));
    expect(summaries.size).toBe(world.clubs.length);
  });

  it("renovação, patrocínio, prêmios e diretoria acontecem em todos os países", () => {
    const before = new Set(end.world.players.map((player) => player.id));
    const countryOfClub = new Map(world.clubs.map((club) => [club.id, club.countryId]));
    for (const country of world.countries) {
      const youth = turned.world.players.filter(
        (player) => !before.has(player.id) && countryOfClub.get(player.clubId) === country.id,
      );
      expect(youth.length, `jovens de ${country.id}`).toBeGreaterThan(0);
      const clubs = new Set(world.clubs.filter((c) => c.countryId === country.id).map((c) => c.id));
      const sponsorship = turned.finances?.ledger.filter(
        (entry) => entry.category === "sponsorship" && clubs.has(entry.clubId),
      );
      expect(sponsorship?.length, `patrocínio de ${country.id}`).toBe(clubs.size);
      const prizes = turned.finances?.seasons.filter(
        (summary) => clubs.has(summary.clubId) && summary.totals.prize > 0,
      );
      expect(prizes?.length, `prêmios de ${country.id}`).toBe(clubs.size);
      const coached = [...clubs].filter(
        (id) => id === manager || turned.board?.clubs[id]?.coachId !== null,
      );
      expect(coached.length, `técnicos de ${country.id}`).toBe(clubs.size);
    }
    expect(turned.renewal?.regulators).toBeDefined();
    expect(Object.keys(turned.renewal?.regulators ?? {}).sort()).toEqual(
      world.countries
        .slice(1)
        .map((country) => country.id)
        .sort(),
    );
  });

  it("cada jogador envelhece e evolui uma vez só", () => {
    const year = end.league.year;
    const before = new Map(end.world.players.map((player) => [player.id, player]));
    const survivors = turned.world.players.filter((player) => before.has(player.id));
    expect(survivors.length).toBeGreaterThan(world.players.length * 0.8);
    // Nenhum salto de força absurdo (evolução repetida N vezes aparece como saltos grandes).
    const jumps = survivors.filter(
      (player) => Math.abs(player.strength - (before.get(player.id)?.strength ?? 0)) > 12,
    );
    expect(jumps.length).toBeLessThan(survivors.length * 0.02);
    expect(year).toBeGreaterThan(0);
  });

  it("é determinístico", () => {
    const again = ok(
      seasonTurnover(end.league, end.world, [], {
        careerSeed: SEED,
        finances: end.finances,
        managerClubId: manager,
        ...(end.renewal ? { renewal: end.renewal } : {}),
        ...(end.market ? { market: end.market } : {}),
        ...(end.board ? { board: end.board } : {}),
        ...(end.fans ? { fans: end.fans } : {}),
        ...(end.news ? { news: end.news } : {}),
        competitions: end.competitions,
        calendar: end.calendar,
      }),
    );
    expect(JSON.stringify(again)).toBe(JSON.stringify(turned));
  }, 120_000);
});
