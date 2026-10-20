import { describe, expect, it } from "vitest";
import { runSimulateWorld } from "../src/simulate-world";

describe("sim:world", () => {
  it("mesma seed ⇒ mesma saída, uma linha por temporada, minutagem e trocas de técnico", () => {
    const first = runSimulateWorld({ seed: "42", seasons: 2 });
    expect(runSimulateWorld({ seed: "42", seasons: 2 })).toEqual(first);
    expect(first.lines.filter((line) => /^[✓✗]\s+\d+ /.test(line))).toHaveLength(2);
    expect(first.lines.at(-2)).toMatch(/jovens com mais minutos/);
    expect(first.lines.at(-1)).toMatch(/trocam de técnico/);
  }, 120000);
});
