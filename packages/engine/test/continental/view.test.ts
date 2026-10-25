import { describe, expect, it } from "vitest";
import { continentalView, dropInZones } from "../../src/continental/view";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, continentalLeague, playDays } from "../career/continental-helpers";

describe("visão da competição entre países (022 US4, FR-022, FR-023)", () => {
  const { state, manager, seed } = compactState({ seed: "continental-visao" });

  it("as posições dos grupos que descem para a menor viram zonas da tabela", () => {
    const zones = dropInZones(state.world, CONTINENTAL_IDS.major, 0);
    expect(zones).toEqual([
      {
        from: 3,
        to: 3,
        competitionId: CONTINENTAL_IDS.minor,
        level: 1,
        entry: { stage: 2 },
        berthId: "terceiros-dos-grupos",
      },
    ]);
    expect(dropInZones(state.world, CONTINENTAL_IDS.major, 1)).toEqual([]);
    expect(dropInZones(state.world, CONTINENTAL_IDS.minor, 0)).toEqual([]);
  });

  it("as fases aparecem em ordem, com o estado de cada uma e a origem dos participantes", () => {
    const start = continentalView(state.world, continentalLeague(state));
    expect(start.stages.map((stage) => [stage.index, stage.kind, stage.status])).toEqual([
      [1, "groups", "playing"],
      [2, "knockout", "pending"],
    ]);
    expect(start.stages[0]?.dropIns).toHaveLength(1);
    expect(Object.keys(start.origins)).toHaveLength(16);

    const end = playDays(state, "end", seed, manager);
    const done = continentalView(end.world, continentalLeague(end));
    expect(done.stages.map((stage) => stage.status)).toEqual(["finished", "finished"]);
    expect(Object.keys(done.origins)).toHaveLength(16);
  });
});
