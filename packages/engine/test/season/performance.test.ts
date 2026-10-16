import { describe, expect, it } from "vitest";
import { advanceSeason } from "../../src/season/season.js";
import { newSeason, testWorld } from "./helpers/world.js";

describe("desempenho (SC-005)", () => {
  it("uma temporada completa em menos de 2 s", () => {
    const season = newSeason("desempenho");
    const start = performance.now();
    const result = advanceSeason(season, testWorld(), { toEnd: true });
    expect(result.ok).toBe(true);
    expect(performance.now() - start).toBeLessThan(2000);
  }, 30000);
});
