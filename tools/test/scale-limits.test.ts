import { SCALE_LIMITS } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";

describe("SCALE_LIMITS (020 R12)", () => {
  it("declara todas as metas com valores positivos", () => {
    expect(Object.keys(SCALE_LIMITS).sort()).toEqual([
      "dayMs",
      "exportedBytes",
      "growthPerSeasonBytes",
      "heapBytes",
      "saveLastRoundBytes",
      "saveStart31Bytes",
      "thirtySeasonsMs",
      "turnoverMs",
    ]);
    for (const value of Object.values(SCALE_LIMITS)) expect(value).toBeGreaterThan(0);
  });
});
