import { describe, expect, it } from "vitest";
import type { Berth, Competition } from "../../src/model/types";
import { findCycle, resolutionOrder } from "../../src/qualification/order";

function competition(id: string, berths?: Berth[]): Competition {
  return {
    id,
    countryId: "pais",
    name: id,
    format: { type: "knockout", phases: [] },
    divisions: [
      {
        level: 1,
        name: id,
        clubIds: [],
        promotionSlots: 0,
        relegationSlots: 0,
        ...(berths ? { berths } : {}),
      },
    ],
  } as unknown as Competition;
}

const needs = (id: string, ...others: string[]): Berth => ({
  id: `v-${id}`,
  source: { kind: "champion", competitionId: "x" },
  require: others.map((competitionId) => ({ competitionId, level: 1 })),
});

describe("ordem de resolução (021 R9)", () => {
  it("sem dependências, vale a ordem do banco e só entram competições com vagas", () => {
    const list = [competition("a"), competition("b", [needs("b")]), competition("c", [needs("c")])];
    expect(resolutionOrder(list).map((entry) => entry.id)).toEqual(["b", "c"]);
  });

  it("quem depende vem depois de quem é lido", () => {
    const list = [competition("a", [needs("a", "b")]), competition("b", [needs("b")])];
    expect(resolutionOrder(list).map((entry) => entry.id)).toEqual(["b", "a"]);
  });

  it("detecta ciclo A → B → A e autorreferência não é ciclo", () => {
    const cyclic = [competition("a", [needs("a", "b")]), competition("b", [needs("b", "a")])];
    expect(findCycle(cyclic)).toEqual(["a", "b", "a"]);
    expect(() => resolutionOrder(cyclic)).toThrow(/ciclo/);
    const self = [competition("a", [needs("a", "a")])];
    expect(findCycle(self)).toBeUndefined();
  });
});
