import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { isLeagueSeasonOver } from "../../src/career/league";
import type { CareerSeasonState } from "../../src/career/season-state";
import { isCalendarOver } from "../../src/career/season-state";
import { isCountryMain, mainCompetitionOf } from "../../src/world/countries";
import { clubOfCountry, worldBank, worldState } from "./world-helpers";

const SEED = "mundo-dia";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

describe("dia de jogos de vários países (020 R6)", () => {
  const world = worldBank();
  const manager = clubOfCountry(world, 1);

  it("o primeiro dia fecha a rodada 1 da liga principal de todos os países", () => {
    const state = worldState(world, SEED, manager);
    const next = ok(advanceCareerDays(state, { days: 1 }, SEED, manager)).state;
    const mains = [next.league, ...next.competitions].filter((league) =>
      isCountryMain(world, league.competitionId),
    );
    expect(mains).toHaveLength(3);
    for (const league of mains) {
      expect(league.divisions.every((season) => season.nextRound === 2)).toBe(true);
      expect(league.divisions[0]?.records.length).toBeGreaterThan(0);
    }
    expect(next.league.competitionId).toBe(
      mainCompetitionOf(world, world.countries[1]?.id ?? "")?.id,
    );
  });

  it("finanças, torcida e diretoria rodam para os clubes de todos os países", () => {
    const state = worldState(world, SEED, manager);
    const next = ok(advanceCareerDays(state, { days: 6 }, SEED, manager)).state;
    for (const index of [0, 1, 2]) {
      const country = world.countries[index]?.id;
      const clubs = new Set(
        world.clubs.filter((club) => club.countryId === country).map((c) => c.id),
      );
      const wages = next.finances.ledger.filter(
        (entry) => entry.category === "wages" && clubs.has(entry.clubId),
      );
      expect(wages.length, `folha do país ${index}`).toBeGreaterThan(0);
      const moods = [...clubs].filter(
        (id) => next.fans?.clubs[id]?.mood !== state.fans?.clubs[id]?.mood,
      );
      expect(moods.length, `torcida do país ${index}`).toBeGreaterThan(0);
      const confidence = [...clubs].filter(
        (id) => next.board?.clubs[id]?.confidence !== state.board?.clubs[id]?.confidence,
      );
      expect(confidence.length, `diretoria do país ${index}`).toBeGreaterThan(0);
    }
  });

  it("a folha segue a escala do país: país caro paga mais que país barato", () => {
    const state = worldState(world, SEED, manager);
    const next = ok(advanceCareerDays(state, { days: 6 }, SEED, manager)).state;
    const paid = (index: number) => {
      const country = world.countries[index]?.id;
      const clubs = new Set(
        world.clubs.filter((club) => club.countryId === country).map((c) => c.id),
      );
      const entries = next.finances.ledger.filter(
        (entry) => entry.category === "wages" && clubs.has(entry.clubId),
      );
      return -entries.reduce((sum, entry) => sum + entry.amount, 0) / clubs.size;
    };
    const factor = (index: number) =>
      world.competitions.find((c) => c.countryId === world.countries[index]?.id)?.economy
        ?.wageFactorPct ?? 100;
    const [cheap, expensive] = [0, 1, 2]
      .sort((a, b) => factor(a) - factor(b))
      .filter((_, i, all) => i === 0 || i === all.length - 1);
    expect(paid(expensive as number)).toBeGreaterThan(paid(cheap as number));
  });

  it("é determinístico", () => {
    const run = () =>
      JSON.stringify(
        ok(advanceCareerDays(worldState(world, SEED, manager), { days: 5 }, SEED, manager)).state,
      );
    expect(run()).toBe(run());
  });

  it("salvar e carregar no meio não muda nada", () => {
    const first = ok(
      advanceCareerDays(worldState(world, SEED, manager), { days: 3 }, SEED, manager),
    ).state;
    const reloaded = JSON.parse(JSON.stringify(first)) as CareerSeasonState;
    const a = ok(advanceCareerDays(first, { days: 4 }, SEED, manager)).state;
    const b = ok(advanceCareerDays(reloaded, { days: 4 }, SEED, manager)).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("a temporada inteira termina em todos os países", () => {
    const end = ok(
      advanceCareerDays(worldState(world, SEED, manager), { toEnd: true }, SEED, manager),
    ).state;
    expect(isCalendarOver(end)).toBe(true);
    for (const league of [end.league, ...end.competitions]) {
      expect(isLeagueSeasonOver(league), league.competitionId).toBe(true);
    }
    // Mercado da IA e evolução dos jogadores também aconteceram em todos os países.
    for (const index of [0, 1, 2]) {
      const country = world.countries[index]?.id;
      const clubs = new Set(
        world.clubs.filter((club) => club.countryId === country).map((c) => c.id),
      );
      const deals = end.market?.log.filter(
        (entry) => clubs.has(entry.toClubId ?? "") || clubs.has(entry.fromClubId ?? ""),
      );
      expect(deals?.length, `mercado do país ${index}`).toBeGreaterThan(0);
      const before = new Map(world.players.map((player) => [player.id, player.strength]));
      const evolved = end.world.players.filter(
        (player) => clubs.has(player.clubId) && before.get(player.id) !== player.strength,
      );
      expect(evolved.length, `evolução do país ${index}`).toBeGreaterThan(0);
    }
  }, 120_000);
});
