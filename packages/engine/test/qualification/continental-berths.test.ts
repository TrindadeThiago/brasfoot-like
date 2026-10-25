import { describe, expect, it } from "vitest";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import {
  compactWorld,
  continentalChampion,
  continentalLeague,
} from "../career/continental-helpers";
import { playSeasons } from "../career/qualification-helpers";

const SEASONS = 4;

describe("vagas por país da taça continental (022 US1, FR-006, FR-008, FR-010)", () => {
  const { seasons } = playSeasons(compactWorld("continental-vagas"), "continental-vagas", SEASONS);

  it("a primeira edição usa os clubes do banco e as seguintes vêm das vagas", () => {
    const first = continentalLeague(seasons[0]?.start as never);
    expect(Object.values(first.origins ?? {}).every((origin) => origin.kind === "bank")).toBe(true);
    for (const played of seasons.slice(1)) {
      const league = continentalLeague(played.start);
      const kinds = new Set(Object.values(league.origins ?? {}).map((origin) => origin.kind));
      expect([...kinds].every((kind) => kind === "berth" || kind === "pass")).toBe(true);
    }
  });

  it("toda edição começa com 16 clubes distintos e todos têm origem", () => {
    for (const played of seasons) {
      const league = continentalLeague(played.start);
      const clubs = league.divisions[0]?.clubIds ?? [];
      expect(clubs).toHaveLength(16);
      expect(new Set(clubs).size).toBe(16);
      if (played !== seasons[0]) {
        expect(Object.keys(league.origins ?? {}).sort()).toEqual([...clubs].sort());
      }
    }
  });

  it("o campeão de uma edição joga a seguinte", () => {
    for (let index = 0; index < seasons.length - 1; index++) {
      const champion = continentalChampion(seasons[index]?.end as never);
      const next = continentalLeague(seasons[index + 1]?.start as never);
      expect(champion).toBeDefined();
      expect(next.divisions[0]?.clubIds).toContain(champion);
    }
  });

  it("vaga já ocupada passa adiante: o clube entra uma vez e a vaga vai para outro", () => {
    const passes = seasons
      .slice(1)
      .flatMap((played) =>
        Object.entries(continentalLeague(played.start).origins ?? {}).flatMap(([clubId, origin]) =>
          origin.kind === "pass"
            ? [{ clubId, origin, league: continentalLeague(played.start) }]
            : [],
        ),
      );
    expect(passes.length).toBeGreaterThan(0);
    for (const { clubId, origin, league } of passes) {
      expect(origin.kind === "pass" && origin.reason).toBe("duplicate");
      expect(league.divisions[0]?.clubIds).toContain(
        origin.kind === "pass" ? origin.fromClubId : "",
      );
      expect(league.divisions[0]?.clubIds.filter((id) => id === clubId)).toHaveLength(1);
    }
  });

  it("a taça tem as vagas declaradas na divisão e a vaga do campeão anterior", () => {
    const world = compactWorld("continental-vagas");
    const division = world.competitions.find((entry) => entry.id === CONTINENTAL_IDS.major)
      ?.divisions[0];
    const berths = division?.berths ?? [];
    expect(berths.some((berth) => berth.id === "campeao-anterior")).toBe(true);
    expect(
      berths.some(
        (berth) =>
          berth.source.kind === "champion" && berth.source.competitionId === CONTINENTAL_IDS.major,
      ),
    ).toBe(true);
  });
});
