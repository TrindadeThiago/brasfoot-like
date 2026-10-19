import { describe, expect, it } from "vitest";
import { runSimulateEconomy } from "../src/simulate-economy";

describe("sim:economy", () => {
  it("mesma seed ⇒ mesma saída, uma linha por temporada e os limites de R10", () => {
    const first = runSimulateEconomy({ seed: "42", seasons: 2 });
    expect(runSimulateEconomy({ seed: "42", seasons: 2 })).toEqual(first);
    expect(first.lines.filter((line) => /^[✓✗]\s+\d+ /.test(line))).toHaveLength(2);
    expect(first.lines.filter((line) => /^[✓✗] [A-Za-zÀ-ú]/.test(line))).toHaveLength(3);
  }, 120000);
});
