import { describe, expect, it } from "vitest";
import { FORMATION_IDS, FORMATIONS, POSTURES } from "../../src/match/formations.js";

const DEFENDERS = new Set(["CB", "FB"]);
const MIDFIELDERS = new Set(["DM", "MF"]);

describe("catálogo de esquemas (FR-003)", () => {
  it("tem os 6 esquemas previstos", () => {
    expect(FORMATION_IDS).toEqual(["4-4-2", "4-3-3", "3-5-2", "4-5-1", "5-3-2", "4-2-3-1"]);
  });

  it.each(FORMATION_IDS)("%s tem 11 vagas únicas e exatamente 1 goleiro", (id) => {
    const slots = FORMATIONS[id].slots;
    expect(slots).toHaveLength(11);
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(11);
    expect(slots.filter((slot) => slot.position === "GK")).toHaveLength(1);
  });

  it.each(FORMATION_IDS)("%s distribui as posições conforme o nome", (id) => {
    const numbers = id.split("-").map(Number);
    const slots = FORMATIONS[id].slots;
    const defenders = slots.filter((slot) => DEFENDERS.has(slot.position)).length;
    const midfielders = slots.filter((slot) => MIDFIELDERS.has(slot.position)).length;
    const forwards = slots.filter((slot) => slot.position === "FW").length;
    expect(defenders).toBe(numbers[0]);
    expect(forwards).toBe(numbers[numbers.length - 1]);
    expect(midfielders).toBe(numbers.slice(1, -1).reduce((sum, value) => sum + value, 0));
  });

  it("tem as três posturas (FR-004)", () => {
    expect(POSTURES).toEqual(["defensive", "balanced", "attacking"]);
  });
});
