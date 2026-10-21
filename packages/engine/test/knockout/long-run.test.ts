import { describe, expect, it } from "vitest";
import { createCupSeason } from "../../src/knockout/bracket";
import { cupChampion, tieState } from "../../src/knockout/tie";
import { CUP_ID, cupBank } from "../fixtures/cup-bank";
import { playCup } from "./helpers";

// 018 SC-001/SC-002 (Princípio V): 1.000 edições da copa de teste, só o motor (sorteio, partidas
// com prorrogação e pênaltis). Limites declarados aqui; valores medidos em research.md R14.
const EDITIONS = 1000;
const MIN_LOW_TITLE_SHARE = 0.01;

describe("1.000 copas (018 SC-001, SC-002)", () => {
  it("todo confronto tem um classificado; os favoritos vencem mais, mas há zebras", () => {
    const world = cupBank();
    const cup = world.competitions.find((entry) => entry.id === CUP_ID);
    const participants = cup?.divisions[0]?.clubIds ?? [];
    const ranked = [...participants].sort(
      (a, b) =>
        (world.clubs.find((club) => club.id === b)?.reputation ?? 0) -
          (world.clubs.find((club) => club.id === a)?.reputation ?? 0) || (a < b ? -1 : 1),
    );
    const top = new Set(ranked.slice(0, 8));
    const bottom = new Set(ranked.slice(8));
    let topTitles = 0;
    let bottomTitles = 0;
    for (let n = 0; n < EDITIONS; n++) {
      const created = createCupSeason(world, { competitionId: CUP_ID, seed: `longa-${n}` });
      if (!created.ok) throw new Error(JSON.stringify(created.error));
      const done = playCup(world, created.season);
      for (const phase of done.bracket?.phases ?? []) {
        for (const tie of phase.ties) {
          const state = tieState(done, phase.index, tie.id);
          expect(state.decided && state.winner !== undefined).toBe(true);
        }
      }
      const champion = cupChampion(done)?.championId ?? "";
      if (top.has(champion)) topTitles += 1;
      else if (bottom.has(champion)) bottomTitles += 1;
    }
    console.log(
      `copa longa: favoritos ${topTitles}/${EDITIONS}, demais ${bottomTitles}/${EDITIONS}`,
    );
    expect(topTitles + bottomTitles).toBe(EDITIONS);
    expect(topTitles).toBeGreaterThan(bottomTitles);
    expect(bottomTitles / EDITIONS).toBeGreaterThanOrEqual(MIN_LOW_TITLE_SHARE);
  }, 600_000);
});
