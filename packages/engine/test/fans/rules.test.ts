import { describe, expect, it } from "vitest";
import { DEFAULT_FANS, fansRules } from "../../src/fans/rules";
import { boardSchema, fansSchema } from "../../src/model/schemas";
import { editedWorld } from "../market/helpers";

describe("regras da torcida (013 R14)", () => {
  it("padrões e sobrescrita parcial", () => {
    const plain = editedWorld(() => {});
    expect(fansRules(plain, plain.competitions[0]?.id ?? "")).toEqual(DEFAULT_FANS);
    const world = editedWorld((copy) => {
      const competition = copy.competitions[0];
      if (competition) competition.fans = { loss: 9, bands: [10, 30, 70, 90] };
    });
    const rules = fansRules(world, world.competitions[0]?.id ?? "");
    expect(rules.loss).toBe(9);
    expect(rules.bands).toEqual([10, 30, 70, 90]);
    expect(rules.win).toBe(DEFAULT_FANS.win);
  });

  it("schemas aceitam parciais e recusam fora da faixa", () => {
    expect(fansSchema.safeParse({ neutral: 40 }).success).toBe(true);
    expect(fansSchema.safeParse({ neutral: 140 }).success).toBe(false);
    expect(boardSchema.safeParse({ derbyPct: 50 }).success).toBe(true);
  });
});
