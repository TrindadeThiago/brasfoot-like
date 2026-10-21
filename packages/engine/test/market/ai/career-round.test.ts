import { describe, expect, it } from "vitest";
import { advanceCareer } from "../../../src/career/day";
import { initialRenewal } from "../../../src/renewal/measure";
import { MANAGER, marketContext, SEED } from "../helpers";

const ctx = marketContext();

function run(withMarket: boolean, rounds = 2) {
  const result = advanceCareer(
    ctx.league,
    ctx.finances,
    ctx.world,
    { rounds },
    MANAGER,
    undefined,
    { state: initialRenewal(ctx.world), careerSeed: SEED },
    withMarket ? { state: ctx.market, careerSeed: SEED } : undefined,
  );
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result;
}

describe("mercado na rodada da carreira (011 R1)", () => {
  it("sem mercado o resultado não traz mercado", () => {
    expect(run(false).market).toBeUndefined();
  });

  it("com mercado a rodada devolve o estado do mercado", () => {
    const result = run(true);
    expect(result.market).toBeDefined();
    expect(result.market?.reports).toEqual([]);
  });

  it("a liga e o resultado esportivo não dependem do mercado", () => {
    expect(run(true).league.divisions.map((season) => season.records.length)).toEqual(
      run(false).league.divisions.map((season) => season.records.length),
    );
  });

  it("é determinístico", () => {
    expect(run(true, 5)).toEqual(run(true, 5));
  });
});
