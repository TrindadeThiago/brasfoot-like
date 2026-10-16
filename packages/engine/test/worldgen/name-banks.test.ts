import { describe, expect, it } from "vitest";
import nameBank from "../../src/worldgen/name-banks/default.json" with { type: "json" };
import { nameBankSchema } from "../../src/worldgen/name-banks/schema";

const uniqueCount = (values: string[]) => new Set(values).size;

describe("banco de nomes padrão", () => {
  it("passa no schema", () => {
    expect(nameBankSchema.safeParse(nameBank).success).toBe(true);
  });

  it("tem volume suficiente e sem repetições", () => {
    expect(uniqueCount(nameBank.firstNames)).toBe(nameBank.firstNames.length);
    expect(uniqueCount(nameBank.surnames)).toBe(nameBank.surnames.length);
    expect(uniqueCount(nameBank.cities)).toBe(nameBank.cities.length);
    expect(nameBank.firstNames.length).toBeGreaterThanOrEqual(200);
    expect(nameBank.surnames.length).toBeGreaterThanOrEqual(200);
    expect(nameBank.cities.length).toBeGreaterThanOrEqual(60);
    expect(nameBank.clubPrefixes.length).toBeGreaterThanOrEqual(4);
    expect(nameBank.clubSuffixes.length).toBeGreaterThanOrEqual(4);
  });
});
