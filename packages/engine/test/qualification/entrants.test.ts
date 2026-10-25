import { describe, expect, it } from "vitest";
import { createCupSeason, phaseParticipants } from "../../src/knockout/bracket";
import { applyQualification } from "../../src/qualification/apply";
import { CUP_ID, cupBank, lateEntryCup } from "../fixtures/cup-bank";

describe("applyQualification (021 R2)", () => {
  const world = cupBank(lateEntryCup);
  const cup = world.competitions.find((entry) => entry.id === CUP_ID);
  const clubs = world.clubs.map((club) => club.id).sort();
  const composition = clubs.slice(20, 32);
  const entering = composition.slice(0, 4);

  it("participantes e entradas tardias da temporada seguinte vêm das vagas", () => {
    // competições fora do resultado não mudam
    expect(applyQualification(world, { compositions: {}, entrants: {} })).toEqual(world);
    expect(cup?.divisions[0]?.berths).toBeUndefined();

    const fed = structuredClone(world);
    const target = fed.competitions.find((entry) => entry.id === CUP_ID);
    if (!target) throw new Error("sem copa");
    (target.divisions[0] as { berths?: unknown }).berths = [
      { id: "v", source: { kind: "champion", competitionId: "x" } },
    ];
    const applied = applyQualification(fed, {
      compositions: { [CUP_ID]: { 1: composition } },
      entrants: { [CUP_ID]: { 1: Object.fromEntries(entering.map((id) => [id, { phase: 2 }])) } },
    });
    const after = applied.competitions.find((entry) => entry.id === CUP_ID);
    expect(after?.divisions[0]?.clubIds).toEqual(composition);
    expect(after?.format.type === "knockout" && after.format.entries).toEqual([
      { phase: 1, clubIds: [...entering].sort() },
    ]);
    // o original não muda
    expect(target.divisions[0]?.clubIds).not.toEqual(composition);

    const season = createCupSeason(applied, { competitionId: CUP_ID, seed: "t" });
    if (!season.ok) throw new Error(JSON.stringify(season.error));
    expect(season.season.clubIds).toEqual(composition);
    expect(phaseParticipants(season.season, applied, 0)).toHaveLength(8);
    expect(phaseParticipants(season.season, applied, 1)).toEqual(expect.arrayContaining(entering));
  });

  it("sem entradas tardias, a copa não tem `entries`", () => {
    const fed = structuredClone(world);
    const target = fed.competitions.find((entry) => entry.id === CUP_ID);
    if (target?.format.type !== "knockout") throw new Error("sem copa");
    (target.divisions[0] as { berths?: unknown }).berths = [
      { id: "v", source: { kind: "champion", competitionId: "x" } },
    ];
    const applied = applyQualification(fed, {
      compositions: { [CUP_ID]: { 1: composition } },
      entrants: {},
    });
    const after = applied.competitions.find((entry) => entry.id === CUP_ID);
    expect(after?.format.type === "knockout" && after.format.entries).toBeUndefined();
  });
});
