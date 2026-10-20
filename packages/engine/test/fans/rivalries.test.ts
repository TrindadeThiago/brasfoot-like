import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isDerby, rivalryOf, rivalsOf } from "../../src/fans/rivalries";
import type { Club, CompletedBank, Rivalry } from "../../src/model/types";
import { DEFAULT_BANK_SEED } from "../../src/worldgen/default-seed";
import { generateRivalries } from "../../src/worldgen/rivalries";

const MOD = join(import.meta.dirname, "../../../../mods/default");
const clubs = JSON.parse(readFileSync(join(MOD, "clubs.json"), "utf8")) as Club[];
const competitions = JSON.parse(readFileSync(join(MOD, "competitions.json"), "utf8")) as {
  divisions: { level: number; clubIds: string[] }[];
}[];

describe("rivalidades (013 R1, R2)", () => {
  const world = {
    rivalries: [{ clubIds: ["a", "b"], intensity: 3 }],
  } as unknown as Pick<CompletedBank, "rivalries">;

  it("busca simétrica, rivais e clássico", () => {
    expect(rivalryOf(world, "b", "a")?.intensity).toBe(3);
    expect(rivalsOf(world, "a")).toEqual([{ clubId: "b", intensity: 3 }]);
    expect(isDerby(world, { home: "b", away: "a" })).toBe(true);
    expect(isDerby(world, { home: "a", away: "c" })).toBe(false);
    expect(rivalryOf({}, "a", "b")).toBeUndefined();
  });

  it("banco padrão: determinístico, 1 a 3 rivais por clube, igual ao arquivo versionado", () => {
    const generated = generateRivalries(clubs, DEFAULT_BANK_SEED);
    expect(generateRivalries(clubs, DEFAULT_BANK_SEED)).toEqual(generated);
    const counts = new Map<string, number>();
    for (const rivalry of generated) {
      for (const clubId of rivalry.clubIds) counts.set(clubId, (counts.get(clubId) ?? 0) + 1);
    }
    expect(counts.size).toBe(clubs.length);
    expect(Math.min(...counts.values())).toBeGreaterThanOrEqual(1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(3);
    expect(generated.filter((rivalry) => rivalry.intensity === 3).length).toBeGreaterThan(0);
    const saved = JSON.parse(readFileSync(join(MOD, "rivalries.json"), "utf8")) as Rivalry[];
    expect(saved).toEqual(generated);
  });

  it("cada divisão do banco padrão tem ao menos 4 clássicos por turno (SC-004)", () => {
    const generated = generateRivalries(clubs, DEFAULT_BANK_SEED);
    for (const division of competitions[0]?.divisions ?? []) {
      const inside = generated.filter((rivalry) =>
        rivalry.clubIds.every((clubId) => division.clubIds.includes(clubId)),
      );
      expect(inside.length).toBeGreaterThanOrEqual(4);
    }
  });
});
