import { describe, expect, it } from "vitest";
import { adequacy } from "../../src/match/adequacy";
import { POSITIONS } from "../../src/model/catalogs";

describe("adequação posição × vaga (FR-007)", () => {
  const values = POSITIONS.flatMap((player) =>
    POSITIONS.map((slot) => ({ player, slot, value: adequacy(player, slot) })),
  );

  it("vale 1 na própria posição e fica em (0, 1]", () => {
    for (const { player, slot, value } of values) {
      if (player === slot) expect(value).toBe(1);
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("é simétrica", () => {
    for (const { player, slot, value } of values) {
      expect(adequacy(slot, player)).toBe(value);
    }
  });

  it("perde mais quanto mais distante a posição", () => {
    expect(adequacy("FB", "CB")).toBeGreaterThan(adequacy("FB", "FW"));
    expect(adequacy("DM", "MF")).toBeGreaterThan(adequacy("DM", "FW"));
    expect(adequacy("CB", "DM")).toBeGreaterThan(adequacy("CB", "FW"));
  });

  it("goleiro na linha e jogador de linha no gol são as piores combinações", () => {
    const outfield = POSITIONS.filter((position) => position !== "GK");
    const outfieldPairs = outfield.flatMap((a) => outfield.map((b) => adequacy(a, b)));
    const worstOutfield = Math.min(...outfieldPairs);
    for (const position of outfield) {
      expect(adequacy(position, "GK")).toBeLessThan(worstOutfield);
    }
  });
});
