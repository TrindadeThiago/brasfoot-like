import { describe, expect, it } from "vitest";
import { toCanonicalJson } from "../../src/serialize/canonical-json";
import { validateBank } from "../../src/validation/validate";
import { generateDefaultBank } from "../../src/worldgen/generate";

describe("desempenho (SC-005)", () => {
  it("gera e valida o banco padrão em menos de 2 segundos", () => {
    const start = performance.now();
    const bank = generateDefaultBank({ seed: "desempenho" });
    const result = validateBank(JSON.parse(toCanonicalJson(bank)));
    const elapsed = performance.now() - start;
    expect(result.ok).toBe(true);
    expect(elapsed).toBeLessThan(2000);
  });
});
