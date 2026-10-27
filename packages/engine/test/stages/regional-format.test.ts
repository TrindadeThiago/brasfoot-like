import { describe, expect, it } from "vitest";
import { tieState } from "../../src/knockout/tie";
import { cupView, overallRanks } from "../../src/stages/cup-view";
import { seasonStages } from "../../src/stages/rules";
import { playToEnd, regionalSeasons, regionalState } from "../career/regional-helpers";

describe("formato do estadual (023 FR-003, FR-004)", () => {
  const { state, manager, seed } = regionalState();
  const end = playToEnd(state, seed, manager);

  it("cada divisão tem grupos e depois mata-mata; a final é em ida e volta", () => {
    for (const league of regionalSeasons(end)) {
      for (const season of league.divisions) {
        const formats = seasonStages(end.world, season);
        expect(formats.map((format) => format.type)).toEqual(["groups", "knockout"]);
        const knockout = formats[1];
        if (knockout?.type !== "knockout") throw new Error("sem mata-mata");
        expect(knockout.phases.at(-1)?.legs).toBe(2);
        expect(knockout.phases.slice(0, -1).every((phase) => phase.legs === 1)).toBe(true);
        const bracket = season.stages?.[1]?.bracket;
        const final = bracket?.phases.at(-1);
        expect(final?.rounds).toHaveLength(2);
        expect(final?.ties).toHaveLength(1);
      }
    }
  });

  it("os jogos únicos têm vencedor (pênaltis se preciso) e o mando é do melhor campanha", () => {
    let singles = 0;
    for (const league of regionalSeasons(end)) {
      for (const season of league.divisions) {
        const ranks = overallRanks(season, end.world, 1);
        const view = cupView(season, end.world, 1);
        const phases = view.bracket?.phases ?? [];
        for (const phase of phases.slice(0, -1)) {
          for (const tie of phase.ties) {
            const state = tieState(view, phase.index, tie.id);
            expect(state.decided).toBe(true);
            expect(state.winner).toBeDefined();
            singles += 1;
            // O mandante tem posição geral melhor (número menor) que o visitante.
            expect(ranks[tie.home] ?? 99).toBeLessThanOrEqual(ranks[tie.away] ?? 99);
          }
        }
      }
    }
    expect(singles).toBeGreaterThan(0);
  });
});
