import { describe, expect, it } from "vitest";
import { regionalCompetitionOf } from "../../src/regional/scope";
import { playSeasons } from "../career/qualification-helpers";
import { nationalManager, regionalWorld } from "../career/regional-helpers";
import { worldBank } from "../career/world-helpers";

const SEED = "estaduais-noticias";

describe("manchetes do estadual (023 R8, FR-012)", () => {
  const world = regionalWorld({}, SEED);
  const manager = nationalManager(world);
  const { seasons, history } = playSeasons(world, SEED, 2, { manager });
  const second = seasons[1]?.start;
  const opening = second?.news?.feed.find((round) => round.season === 2 && round.round === 0);
  const regional = (opening?.headlines ?? []).filter((headline) =>
    headline.type.startsWith("regional"),
  );

  it("a abertura da nova temporada traz campeões, promovidos e rebaixados do estadual do técnico", () => {
    const own = regionalCompetitionOf(world, manager);
    const edition = history.regionalHistory?.find(
      (item) => item.competitionId === own?.id && item.number === 1,
    );
    expect(edition).toBeDefined();
    const types = regional.map((headline) => headline.type);
    expect(types.filter((type) => type === "regionalChampion")).toHaveLength(2);
    expect(types.filter((type) => type === "regionalPromoted")).toHaveLength(2);
    expect(types.filter((type) => type === "regionalRelegated")).toHaveLength(2);
    for (const division of edition?.divisions ?? []) {
      expect(regional.map((headline) => headline.vars.club)).toContain(division.championId);
    }
  });

  it("só o estadual do técnico entra, e as variáveis levam o estadual e a divisão", () => {
    const own = regionalCompetitionOf(world, manager);
    for (const headline of regional) {
      expect(headline.vars.competition).toBe(own?.id);
      expect([1, 2]).toContain(headline.vars.level);
    }
  });

  it("não há manchetes regionais num mundo sem estadual", () => {
    const plain = playSeasons(worldBank({}, SEED), SEED, 2);
    const feed = plain.seasons[1]?.start.news?.feed ?? [];
    const types = feed.flatMap((round) => round.headlines.map((headline) => headline.type));
    expect(types.some((type) => type.startsWith("regional"))).toBe(false);
    expect(plain.history.regionalHistory ?? []).toEqual([]);
  });
});
