import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { resolveFinishedSeasons } from "../../src/qualification/finish";
import { baseWorld, playedOnce } from "../qualification/helpers";
import { allSeasons } from "./qualification-helpers";

// Sem vagas no banco nada muda (FR-022): o baseline de `composition-baseline.test.ts` cobre as
// composições; aqui os pontos de entrada novos ficam inertes.
describe("compatibilidade sem vagas entre competições", () => {
  const { world } = baseWorld();
  const { end } = playedOnce(world, "compat-021");

  it("a resolução não faz nada e o mundo não ganha campos de vagas", () => {
    expect(resolveFinishedSeasons(end.world, allSeasons(end), end.league)).toBeUndefined();
    expect(end.league.origins).toBeUndefined();
    expect(end.competitions.every((league) => league.origins === undefined)).toBe(true);
    expect(
      end.world.competitions.every((c) => c.divisions.every((d) => d.berths === undefined)),
    ).toBe(true);
  });

  it("nextComposition não retira ninguém da pirâmide", () => {
    for (const league of allSeasons(end)) {
      if (league.divisions[0]?.bracket) continue;
      const change = nextComposition(league, end.world);
      expect(change.relegatedOut).toEqual([]);
      expect(change.promotedOut).toEqual([]);
    }
  });
});
