import { describe, expect, it } from "vitest";
import { boardRules, DEFAULT_BOARD } from "../../src/board/rules";
import { boardSchema } from "../../src/model/schemas";
import { editedWorld } from "../market/helpers";

describe("regras da diretoria (research.md R17)", () => {
  it("padrões sem `competition.board`", () => {
    const world = editedWorld(() => {});
    expect(boardRules(world, world.competitions[0]?.id ?? "")).toEqual(DEFAULT_BOARD);
  });

  it("sobrescrita parcial", () => {
    const world = editedWorld((copy) => {
      const competition = copy.competitions[0];
      if (competition) competition.board = { neutral: 50, graceRounds: 3 };
    });
    const rules = boardRules(world, world.competitions[0]?.id ?? "");
    expect(rules.neutral).toBe(50);
    expect(rules.graceRounds).toBe(3);
    expect(rules.fireThreshold).toBe(DEFAULT_BOARD.fireThreshold);
  });

  it("schema aceita parcial e recusa fora da faixa", () => {
    expect(boardSchema.safeParse({ neutral: 70 }).success).toBe(true);
    expect(boardSchema.safeParse({ neutral: 170 }).success).toBe(false);
    expect(boardSchema.safeParse({ initialReputation: 0 }).success).toBe(false);
  });
});
