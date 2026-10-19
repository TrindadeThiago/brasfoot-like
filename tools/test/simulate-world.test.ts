import { describe, expect, it } from "vitest";
import { runSimulateWorld } from "../src/simulate-world";

describe("sim:world", () => {
  it("mesma seed ⇒ mesma saída, uma linha por temporada e o critério de minutagem", () => {
    const first = runSimulateWorld({ seed: "42", seasons: 2 });
    expect(runSimulateWorld({ seed: "42", seasons: 2 })).toEqual(first);
    expect(first.lines.filter((line) => /^[✓✗]\s+\d+ /.test(line))).toHaveLength(2);
    expect(first.lines.at(-1)).toMatch(/jovens com mais minutos/);
  }, 120000);
});
