import type { Lineup } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { occupantOf, selectPlace } from "../../src/game/lineup-selection";

const lineup: Lineup = {
  formation: "4-4-2",
  posture: "balanced",
  starters: { gk: "p1", ls: "p2" },
  bench: ["p3"],
};

describe("seleção em dois passos", () => {
  it("primeiro escolhe a origem, depois o destino", () => {
    const first = selectPlace(lineup, undefined, { kind: "slot", slotId: "gk" });
    expect(first).toEqual({ kind: "selected", source: { kind: "slot", slotId: "gk" } });
    expect(
      selectPlace(lineup, { kind: "slot", slotId: "gk" }, { kind: "bench", index: 0 }),
    ).toEqual({
      kind: "move",
      from: { kind: "slot", slotId: "gk" },
      to: { kind: "bench", index: 0 },
    });
  });

  it("mesmo lugar cancela; origem vazia recebe o jogador do destino", () => {
    expect(selectPlace(lineup, { kind: "bench", index: 0 }, { kind: "bench", index: 0 })).toEqual({
      kind: "cancelled",
    });
    expect(
      selectPlace(lineup, { kind: "slot", slotId: "rs" }, { kind: "out", playerId: "p9" }),
    ).toEqual({
      kind: "move",
      from: { kind: "out", playerId: "p9" },
      to: { kind: "slot", slotId: "rs" },
    });
    expect(occupantOf(lineup, { kind: "bench", index: 1 })).toBeUndefined();
  });
});
