import { describe, expect, it } from "vitest";
import { aggregateCredibility, seasonReport } from "../../src/season/credibility";
import { advanceSeason, createSeason } from "../../src/season/season";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";

describe("campeonato crível em 100 temporadas (FR-030 a FR-037, SC-004)", () => {
  it("todos os critérios ficam nas faixas", () => {
    const bank = generateDefaultBank({ seed: "brasfoot-like-default-1" });
    const reports = Array.from({ length: 100 }, (_, index) => {
      const seed = `cred-${index + 1}`;
      const world = completeHiddenAttributes(bank, seed);
      const competitionId = world.competitions[0]?.id as string;
      const created = createSeason(world, { competitionId, divisionLevel: 1, seed });
      if (!created.ok) throw new Error(JSON.stringify(created.error));
      const played = advanceSeason(created.season, world, { toEnd: true });
      if (!played.ok) throw new Error(JSON.stringify(played.error));
      return seasonReport(played.season, world);
    });
    const failures = aggregateCredibility(reports)
      .filter((check) => !check.ok)
      .map(
        (check) =>
          `${check.criterion} = ${check.value.toFixed(3)} (faixa ${check.min ?? "-"}–${check.max ?? "-"})`,
      );
    expect(failures).toEqual([]);
  }, 300000);
});
