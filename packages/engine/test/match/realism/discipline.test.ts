import { describe, expect, it } from "vitest";
import { checkRealism } from "../../../src/match/metrics.js";
import { runLeagueSample } from "./harness.js";

describe("cartões, lesões e pênaltis (FR-046, FR-047, FR-048)", () => {
  it("8.000 partidas de campeonato ficam nas faixas", () => {
    const metrics = runLeagueSample(8000, "realismo-disciplina");
    const relevant = new Set([
      "yellowsPerMatch",
      "redsPerMatch",
      "temperamentCardRatio",
      "injuriesPerMatch",
      "pronenessInjuryRatio",
      "penaltiesPerMatch",
      "penaltyConversion",
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
