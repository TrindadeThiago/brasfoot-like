import { describe, expect, it } from "vitest";
import { addFreeAgents, toFreeAgent } from "../../src/market/free-agents";
import { comparePlayers, searchPlayers } from "../../src/market/search";
import { MANAGER, marketContext } from "./helpers";

const base = marketContext();
const free = base.world.players.filter((player) => player.clubId !== MANAGER).slice(0, 3);
const freeIds = new Set(free.map((player) => player.id));
const context = {
  ...base,
  world: { ...base.world, players: base.world.players.filter((player) => !freeIds.has(player.id)) },
  market: addFreeAgents(
    base.market,
    free.map((player) => toFreeAgent(player, player.clubId, 2026)),
  ),
};

describe("busca no mercado (FR-008, US1)", () => {
  it("sem filtros traz clubes e livres", () => {
    const rows = searchPlayers(context);
    expect(rows.length).toBe(context.world.players.length + 3);
    expect(rows.filter((row) => row.free)).toHaveLength(3);
  });

  it("escopo livres e clubes", () => {
    expect(searchPlayers(context, { scope: "free" }).every((row) => row.free)).toBe(true);
    expect(searchPlayers(context, { scope: "clubs" }).some((row) => row.free)).toBe(false);
  });

  it("filtros combinados atendem todos", () => {
    const rows = searchPlayers(context, {
      positions: ["FW", "MF"],
      strength: [55, 80],
      age: [20, 30],
      maxValue: 5_000_000,
      maxWage: 40_000,
      scope: "clubs",
    });
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(["FW", "MF"]).toContain(row.position);
      expect(row.strength).toBeGreaterThanOrEqual(55);
      expect(row.strength).toBeLessThanOrEqual(80);
      expect(row.age).toBeGreaterThanOrEqual(20);
      expect(row.age).toBeLessThanOrEqual(30);
      expect(row.value).toBeLessThanOrEqual(5_000_000);
      expect(row.wage).toBeLessThanOrEqual(40_000);
    }
  });

  it("contrato terminando e exclusão do próprio clube", () => {
    const year = context.league.year;
    const rows = searchPlayers(context, { contractUntilMax: year, excludeClubId: MANAGER });
    for (const row of rows) {
      expect(row.untilYear).toBeLessThanOrEqual(year);
      expect(row.clubId).not.toBe(MANAGER);
    }
  });

  it("ordenação mantém os filtros e é estável", () => {
    const desc = searchPlayers(
      context,
      { scope: "clubs", positions: ["GK"] },
      { key: "value", dir: "desc" },
    );
    for (let index = 1; index < desc.length; index++) {
      expect(desc[index - 1]?.value ?? 0).toBeGreaterThanOrEqual(desc[index]?.value ?? 0);
    }
    expect(desc.every((row) => row.position === "GK")).toBe(true);
    expect(searchPlayers(context, {}, { key: "strength", dir: "asc" })).toEqual(
      searchPlayers(context, {}, { key: "strength", dir: "asc" }),
    );
  });

  it("nunca expõe atributos ocultos", () => {
    const text = JSON.stringify(searchPlayers(context));
    for (const secret of ["hidden", "potential", "temperament", "injuryProneness"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("comparação aceita de 2 a 4 jogadores", () => {
    const ids = searchPlayers(context).map((row) => row.playerId);
    expect(comparePlayers(context, ids.slice(0, 1)).ok).toBe(false);
    expect(comparePlayers(context, ids.slice(0, 5)).ok).toBe(false);
    const result = comparePlayers(context, ids.slice(0, 3));
    expect(result.ok && result.value.map((row) => row.playerId)).toEqual(ids.slice(0, 3));
    expect(comparePlayers(context, ["inexistente", ids[0] ?? ""]).ok).toBe(false);
  });
});
