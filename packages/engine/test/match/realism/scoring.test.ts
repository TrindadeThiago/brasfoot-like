import { describe, expect, it } from "vitest";
import { checkRealism } from "../../../src/match/metrics";
import { runLeagueSample } from "./harness";

describe("placares e volume de jogo (FR-040, FR-041, FR-049)", () => {
  it("10.000 partidas de campeonato ficam nas faixas", () => {
    const metrics = runLeagueSample(10000, "realismo-placares");
    const relevant = new Set([
      "goalsPerMatch",
      "drawRate",
      "shotsPerMatch",
      "onTargetRate",
      "sevenGoalRate",
      "possessionInRangeRate",
    ]);
    const failures = checkRealism(metrics)
      .filter((check) => relevant.has(check.metric) && !check.ok)
      .map(
        (check) =>
          `${check.metric} = ${check.value.toFixed(3)} (faixa ${check.min ?? "-"}–${check.max ?? "-"})`,
      );
    expect(failures).toEqual([]);
  }, 120000);
});
