import { describe, expect, it } from "vitest";
import { createCupSeason } from "../../src/knockout/bracket";
import { cupChampion, cupReached } from "../../src/knockout/tie";
import { validateBank } from "../../src/validation/validate";
import { CUP_ID, cupBank, cupPackage } from "../fixtures/cup-bank";
import { playCup } from "./helpers";

// Final única (021 R4): a supercopa é uma copa de uma fase com 2 clubes.
type Edit = NonNullable<Parameters<typeof cupBank>[0]>;
const finalOnly: (legs: 1 | 2) => Edit = (legs) => (cup) => {
  if (cup.format.type !== "knockout") throw new Error("não é copa");
  const last = cup.format.phases.at(-1);
  if (!last) throw new Error("sem fases");
  cup.format.phases = [{ ...last, legs, neutral: legs === 1 }];
  cup.divisions = [
    {
      level: 1,
      name: "Final",
      clubIds: (cup.divisions[0]?.clubIds ?? []).slice(0, 2),
      promotionSlots: 0,
      relegationSlots: 0,
    },
  ];
};

describe("copa de uma fase (021 R4)", () => {
  it.each([1, 2] as const)("final em %i jogo(s): sorteio, jogo, campeão e vice", (legs) => {
    const world = cupBank(finalOnly(legs));
    const created = createCupSeason(world, { competitionId: CUP_ID, seed: "super-1" });
    if (!created.ok) throw new Error(JSON.stringify(created.error));
    expect(created.season.calendar).toHaveLength(legs);
    const played = playCup(world, created.season);
    const result = cupChampion(played);
    expect(result).toBeDefined();
    expect(result?.championId).not.toBe(result?.runnerUpId);
    expect(cupReached(played)[result?.championId ?? ""]).toBe(1);
  });

  it("a validação aceita final única com 2 clubes", () => {
    const result = validateBank(cupPackage(finalOnly(1)));
    expect(result.ok).toBe(true);
  });
});
