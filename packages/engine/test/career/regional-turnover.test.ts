import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { playSeasons } from "./qualification-helpers";
import { nationalManager, regionalSeasons, regionalWorld } from "./regional-helpers";

const SEED = "estaduais-virada";
const SEASONS = 4;

describe("virada de temporada com estaduais (023 US2, FR-005, FR-006)", () => {
  const world = regionalWorld({}, SEED);
  const { seasons, history } = playSeasons(world, SEED, SEASONS, {
    manager: nationalManager(world),
  });

  it("guarda uma edição por estadual e temporada, com campeão e vice distintos", () => {
    const perSeason = regionalSeasons(seasons[0]?.start as never).length;
    expect(history.regionalHistory).toHaveLength(perSeason * SEASONS);
    for (const edition of history.regionalHistory ?? []) {
      for (const division of edition.divisions) {
        expect(division.championId).not.toBe(division.runnerUpId);
        expect(division.promotedIds).toHaveLength(division.level === 2 ? 2 : 0);
        expect(division.relegatedIds).toHaveLength(division.level === 1 ? 2 : 0);
      }
    }
  });

  it("as duas divisões mantêm o número de clubes em todas as temporadas", () => {
    for (const played of seasons) {
      for (const league of regionalSeasons(played.start)) {
        expect(league.divisions.map((division) => division.clubIds.length)).toEqual([12, 8]);
      }
    }
  });

  it("o acesso e o rebaixamento acontecem toda temporada e os clubes trocam de divisão", () => {
    for (let index = 0; index < SEASONS - 1; index++) {
      const ended = seasons[index]?.end;
      const next = seasons[index + 1]?.start;
      if (!ended || !next) throw new Error("temporada ausente");
      for (const league of regionalSeasons(ended)) {
        const change = nextComposition(league, ended.world);
        const following = regionalSeasons(next).find(
          (entry) => entry.competitionId === league.competitionId,
        );
        const first = following?.divisions[0]?.clubIds ?? [];
        const second = following?.divisions[1]?.clubIds ?? [];
        for (const clubId of change.promoted[2] ?? []) expect(first).toContain(clubId);
        for (const clubId of change.relegated[1] ?? []) expect(second).toContain(clubId);
        expect((change.promoted[2] ?? []).length).toBe(2);
      }
    }
  });
}, 900_000);
