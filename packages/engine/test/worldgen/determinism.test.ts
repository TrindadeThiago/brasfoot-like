import { describe, expect, it } from "vitest";
import { toCanonicalJson } from "../../src/serialize/canonical-json";
import { validateBank } from "../../src/validation/validate";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { TEST_SEEDS } from "../helpers/seeds";

describe("generateDefaultBank — determinismo (SC-001, SC-007)", () => {
  it.each(TEST_SEEDS)("seed %s: válido, sem avisos e idêntico ao gerar de novo", (seed) => {
    const first = generateDefaultBank({ seed });
    const result = validateBank(JSON.parse(toCanonicalJson(first)));
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(toCanonicalJson(generateDefaultBank({ seed }))).toBe(toCanonicalJson(first));
  });

  it("seeds diferentes produzem bancos diferentes", () => {
    expect(toCanonicalJson(generateDefaultBank({ seed: 42 }))).not.toBe(
      toCanonicalJson(generateDefaultBank({ seed: 43 })),
    );
  });

  it("não grava atributos ocultos (FR-017a)", () => {
    const bank = generateDefaultBank({ seed: 42 });
    expect(bank.players.some((player) => player.hidden !== undefined)).toBe(false);
  });
});
