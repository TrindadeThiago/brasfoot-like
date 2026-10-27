import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import { standings } from "../../src/season/standings";
import { playDays } from "./continental-helpers";
import { playToEnd, regionalSeasons, regionalState } from "./regional-helpers";

describe("salvar e carregar no meio do estadual (023 FR-018)", () => {
  it("o resto da temporada é igual com ou sem ida e volta pelo JSON", () => {
    const { state, manager, seed } = regionalState();
    const midway = playDays(state, 4, seed, manager);
    const reloaded = JSON.parse(JSON.stringify(midway)) as CareerSeasonState;
    const direct = playToEnd(midway, seed, manager);
    const viaJson = playToEnd(reloaded, seed, manager);
    const table = (end: CareerSeasonState) =>
      regionalSeasons(end).map((league) =>
        league.divisions.map((division) => standings(division, end.world).map((row) => row.clubId)),
      );
    expect(table(viaJson)).toEqual(table(direct));
  }, 300_000);

  it("a mesma seed dá o mesmo estadual duas vezes", () => {
    const first = regionalState();
    const second = regionalState();
    const a = playToEnd(first.state, first.seed, first.manager);
    const b = playToEnd(second.state, second.seed, second.manager);
    expect(JSON.stringify(regionalSeasons(a))).toBe(JSON.stringify(regionalSeasons(b)));
  }, 300_000);
});
