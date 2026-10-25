import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { startNextSeason } from "../../src/career/next-season";
import { allSeasons, ok } from "../career/qualification-helpers";
import { clubOfCountry, worldState } from "../career/world-helpers";
import { baseWorld, superCupWorld } from "../qualification/helpers";

// Manchetes das classificações entre competições (021 FR-019).
describe("manchetes de classificação (021 US6)", () => {
  const { world } = superCupWorld();
  const manager = clubOfCountry(world, 0);
  const seed = "noticias-vagas";
  const end = ok(
    advanceCareerDays(worldState(world, seed, manager), { toEnd: true }, seed, manager),
  ).state;
  const next = ok(startNextSeason(end, seed, undefined, manager)).state;
  const summary = next.news?.feed.find((round) => round.round === 0 && round.season === 2);
  const headlines =
    summary?.headlines.filter((headline) => headline.type === "qualification") ?? [];

  it("o campeão classificado ganha manchete na rodada 0 da nova temporada", () => {
    expect(headlines.length).toBeGreaterThanOrEqual(1);
    for (const headline of headlines) {
      expect(headline.vars.competition).toBe("supercopa-teste");
      expect(typeof headline.vars.club).toBe("string");
      expect(headline.id).toMatch(/^2-0-q\d+$/);
    }
    expect(new Set(headlines.map((headline) => headline.id)).size).toBe(headlines.length);
  });

  it("não há manchete para vagas que não são do clube do jogador nem de campeões", () => {
    const competing = allSeasons(next).find((entry) => entry.competitionId === "supercopa-teste");
    const clubs = competing?.divisions[0]?.clubIds ?? [];
    expect(headlines.every((headline) => clubs.includes(headline.vars.club as string))).toBe(true);
  });

  it("sem vagas no banco não há manchete de classificação", () => {
    const plain = baseWorld().world;
    const club = clubOfCountry(plain, 0);
    const done = ok(
      advanceCareerDays(worldState(plain, seed, club), { toEnd: true }, seed, club),
    ).state;
    const again = ok(startNextSeason(done, seed, undefined, club)).state;
    const all = again.news?.feed.flatMap((round) => round.headlines) ?? [];
    expect(all.some((headline) => headline.type === "qualification")).toBe(false);
  });
});
