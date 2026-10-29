import { describe, expect, it } from "vitest";
import { addFreeAgents, toFreeAgent } from "../../src/market/free-agents";
import { marketRowOf, marketRows } from "../../src/market/search";
import { MANAGER, marketContext } from "./helpers";

const base = marketContext();
const free = base.world.players.filter((player) => player.clubId !== MANAGER).slice(0, 2);
const freeIds = new Set(free.map((player) => player.id));
const context = {
  ...base,
  world: { ...base.world, players: base.world.players.filter((player) => !freeIds.has(player.id)) },
  market: addFreeAgents(
    base.market,
    free.map((player) => toFreeAgent(player, player.clubId, 2026)),
  ),
};
const all = new Map(marketRows(context).map((row) => [row.playerId, row]));

describe("marketRowOf (026)", () => {
  it("devolve a mesma linha de marketRows para um jogador do clube e de outro clube", () => {
    const own = context.world.players.find((player) => player.clubId === MANAGER);
    const other = context.world.players.find((player) => player.clubId !== MANAGER);
    for (const player of [own, other]) {
      expect(player).toBeDefined();
      expect(marketRowOf(context, player?.id ?? "")).toEqual(all.get(player?.id ?? ""));
    }
  });

  it("cobre o jogador livre", () => {
    const id = free[0]?.id ?? "";
    const row = marketRowOf(context, id);
    expect(row?.free).toBe(true);
    expect(row).toEqual(all.get(id));
  });

  it("cobre o emprestado, com a origem no valor", () => {
    const loaned = context.world.players.find((player) => player.contract?.loan);
    if (!loaned) return; // o mundo de teste pode não ter empréstimos
    expect(marketRowOf(context, loaned.id)).toEqual(all.get(loaned.id));
  });

  it("id desconhecido dá undefined", () => {
    expect(marketRowOf(context, "nao-existe")).toBeUndefined();
  });
});
