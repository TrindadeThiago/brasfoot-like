import { describe, expect, it } from "vitest";
import { runSimulateSeason } from "../src/simulate-season";

describe("sim:season", () => {
  it("mesma seed ⇒ mesma saída", () => {
    expect(runSimulateSeason({ seed: "42" })).toEqual(runSimulateSeason({ seed: "42" }));
  }, 60000);

  it("uma temporada: tabela com 20 clubes e 10 artilheiros", () => {
    const { exitCode, lines } = runSimulateSeason({ seed: "42" });
    expect(exitCode).toBe(0);
    const header = lines.findIndex((line) => line.startsWith("Pos"));
    expect(header).toBeGreaterThanOrEqual(0);
    const rows = lines.slice(header + 1, header + 21);
    expect(rows.every((line) => /^\s*\d+/.test(line))).toBe(true);
    const scorers = lines.findIndex((line) => line.startsWith("Artilheiros"));
    expect(lines.slice(scorers + 1, scorers + 11).every((line) => /\d+ gols?/.test(line))).toBe(
      true,
    );
  }, 60000);

  it("várias temporadas: um critério por linha com ✓/✗", () => {
    const { lines } = runSimulateSeason({ seed: "42", seasons: 3 });
    const criteria = lines.filter((line) => /^[✓✗] /.test(line));
    expect(criteria).toHaveLength(9);
  }, 60000);
});
