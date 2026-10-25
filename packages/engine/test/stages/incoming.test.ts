import { describe, expect, it } from "vitest";
import type { CareerSeasonState } from "../../src/career/season-state";
import { competitionSeason } from "../../src/career/season-state";
import type { DropIn } from "../../src/model/types";
import { dropInSize, incomingCounts } from "../../src/stages/incoming";
import { stageParticipantCounts } from "../../src/stages/rules";
import { CONTINENTAL_IDS } from "../../src/worldgen/continental";
import { compactState, compactWorld, editedWorld, playUntil } from "../career/continental-helpers";
import { worldState } from "../career/world-helpers";

const world = compactWorld("continental-incoming");
const minor = world.competitions.find((entry) => entry.id === CONTINENTAL_IDS.minor);
const dropIn = minor?.divisions[0]?.dropIns?.[0] as DropIn;

describe("quem chega por ligação, em número (022 R3)", () => {
  it("terceiros de 4 grupos são 4 clubes; perdedores das quartas também", () => {
    expect(dropInSize(world, dropIn)).toBe(4);
    const losers: DropIn = {
      ...dropIn,
      source: { kind: "eliminated", competitionId: CONTINENTAL_IDS.major, stage: 2, phase: 1 },
    };
    expect(dropInSize(world, losers)).toBe(4);
    const semis: DropIn = { ...losers, source: { ...losers.source, phase: 2 } as never };
    expect(dropInSize(world, semis)).toBe(2);
  });

  it("faixas de posição somam por grupo e posição fora do grupo não fecha", () => {
    const two: DropIn = { ...dropIn, source: { ...dropIn.source, from: 3, to: 4 } as never };
    expect(dropInSize(world, two)).toBe(8);
    const out: DropIn = { ...dropIn, source: { ...dropIn.source, from: 3, to: 5 } as never };
    expect(dropInSize(world, out)).toBeUndefined();
    const noStage: DropIn = { ...dropIn, source: { ...dropIn.source, stage: 9 } as never };
    expect(dropInSize(world, noStage)).toBeUndefined();
  });

  it("por fase de destino, e a fase com ligação conta os que chegam", () => {
    const division = minor?.divisions[0];
    if (!minor || !division) throw new Error("sem a menor");
    expect(incomingCounts(world, minor, division)).toEqual([0, 4]);
    const stages = minor.format.type === "stages" ? minor.format.stages : [];
    const counts = stageParticipantCounts(stages, division.clubIds.length, [0, 4]);
    expect(counts).toEqual([4, 8]);
    expect(stageParticipantCounts(stages, division.clubIds.length)).toEqual([4, 4]);
  });
});

const stage = (state: CareerSeasonState, index: number) =>
  competitionSeason(state, CONTINENTAL_IDS.minor).divisions[0]?.stages?.[index];
const finished = (state: CareerSeasonState, index: number) => {
  const season = competitionSeason(state, CONTINENTAL_IDS.minor).divisions[0];
  const rounds = stage(state, index)?.rounds ?? [];
  return !!season && season.nextRound > Math.max(...rounds);
};

describe("a fase de destino espera a ligação (022 US3, FR-009)", () => {
  it("a 2ª fase da menor só começa depois de selar, com vencedores + entrada + ligação", () => {
    const { state, manager, seed } = compactState({ seed: "continental-incoming" });
    const preliminaryDone = playUntil(state, seed, manager, (current) => finished(current, 0));
    // A preliminar acabou, mas os terceiros dos grupos ainda não são conhecidos: a fase espera.
    expect(stage(preliminaryDone, 1)?.started).toBe(false);
    expect(stage(preliminaryDone, 1)?.incoming).toBeUndefined();

    const sealed = playUntil(preliminaryDone, seed, manager, (current) => {
      return stage(current, 1)?.started === true;
    });
    const second = stage(sealed, 1);
    expect(second?.incoming?.[0]?.clubIds).toHaveLength(4);
    expect(second?.clubIds).toHaveLength(8);
    for (const clubId of second?.incoming?.[0]?.clubIds ?? []) {
      expect(second?.clubIds).toContain(clubId);
    }
    // Os 2 vencedores da preliminar e os 2 de entrada direta também estão lá.
    expect(second?.bracket?.phases[0]?.ties).toHaveLength(4);
  });

  it("sem ligação declarada a fase começa assim que a anterior termina (comportamento de antes)", () => {
    const stepping = editedWorld(
      compactWorld("continental-incoming"),
      CONTINENTAL_IDS.minor,
      (competition) => ({
        ...competition,
        divisions: competition.divisions.map(({ dropIns: _ignored, ...division }) => division),
      }),
    );
    const major = stepping.competitions.find((entry) => entry.id === CONTINENTAL_IDS.major);
    const manager = major?.divisions[0]?.clubIds[0] ?? "";
    const state = worldState(stepping, "continental-incoming", manager);
    const preliminaryDone = playUntil(state, "continental-incoming", manager, (current) =>
      finished(current, 0),
    );
    expect(stage(preliminaryDone, 1)?.started).toBe(true);
  });
});
