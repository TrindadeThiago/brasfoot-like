import { describe, expect, it } from "vitest";
import { validateBank } from "../../src/validation/validate";
import { withNationalCup } from "../../src/worldgen/add-cup";
import { generateDefaultBank } from "../../src/worldgen/generate";

const SEED = "brasfoot-like-default-1";

describe("withNationalCup (carreiras anteriores à 018)", () => {
  const without = generateDefaultBank({ seed: SEED });
  const withCup = generateDefaultBank({ seed: SEED, cup: true });

  it("gera a mesma copa do banco padrão distribuído", () => {
    expect(withNationalCup(without).competitions).toEqual(withCup.competitions);
  });

  it("o banco resultante é válido", () => {
    expect(validateBank(withNationalCup(without)).ok).toBe(true);
  });

  it("não altera um mundo que já tem copa nem muda a entrada", () => {
    expect(withNationalCup(withCup)).toBe(withCup);
    const before = JSON.stringify(without);
    withNationalCup(without);
    expect(JSON.stringify(without)).toBe(before);
  });
});
