import { describe, expect, it } from "vitest";
import { validateBank } from "../../src/validation/validate";
import { withDefaultCupLegs, withNationalCup } from "../../src/worldgen/add-cup";
import { generateDefaultBank } from "../../src/worldgen/generate";

const SEED = "brasfoot-like-default-1";

describe("withNationalCup (carreiras anteriores à 018)", () => {
  const without = generateDefaultBank({ seed: SEED });
  const withCup = generateDefaultBank({ seed: SEED, cup: true });

  it("gera a mesma copa do banco padrão distribuído", () => {
    expect(withNationalCup(without).competitions).toEqual(withCup.competitions);
  });

  it("o banco resultante é válido", () => {
    expect(validateBank(withNationalCup(without)).ok).toBe(true);
  });

  it("não altera um mundo que já tem copa nem muda a entrada", () => {
    expect(withNationalCup(withCup)).toBe(withCup);
    const before = JSON.stringify(without);
    withNationalCup(without);
    expect(JSON.stringify(without)).toBe(before);
  });
});

describe("withDefaultCupLegs (carreiras com a copa de jogo único)", () => {
  const current = generateDefaultBank({ seed: SEED, cup: true });
  const legsOf = (world: typeof current) => {
    const cup = world.competitions.find((competition) => competition.id === "copa-nacional");
    return cup?.format.type === "knockout" ? cup.format.phases.map((phase) => phase.legs) : [];
  };
  /** A copa como era antes: jogo único em tudo, menos a semifinal. */
  const old = {
    ...current,
    competitions: current.competitions.map((competition) =>
      competition.id === "copa-nacional" && competition.format.type === "knockout"
        ? {
            ...competition,
            format: {
              ...competition.format,
              phases: competition.format.phases.map((phase, index, all) => ({
                ...phase,
                legs: index === all.length - 2 ? (2 as const) : (1 as const),
              })),
            },
          }
        : competition,
    ),
  };

  it("passa oitavas, quartas e semifinal para ida e volta e mantém a final única", () => {
    expect(legsOf(old)).toEqual([1, 1, 1, 1, 2, 1]);
    expect(legsOf(withDefaultCupLegs(old))).toEqual([1, 1, 2, 2, 2, 1]);
    expect(withDefaultCupLegs(old).competitions).toEqual(current.competitions);
  });

  it("o banco resultante é válido", () => {
    expect(validateBank(withDefaultCupLegs(old)).ok).toBe(true);
  });

  it("não mexe em quem já está certo, nem na entrada, nem em copa de mod", () => {
    expect(withDefaultCupLegs(current)).toBe(current);
    const before = JSON.stringify(old);
    withDefaultCupLegs(old);
    expect(JSON.stringify(old)).toBe(before);
    const mod = {
      ...old,
      competitions: old.competitions.map((competition) =>
        competition.id === "copa-nacional" ? { ...competition, id: "copa-do-mod" } : competition,
      ),
    };
    expect(withDefaultCupLegs(mod)).toBe(mod);
  });

  it("um mundo sem copa fica como está", () => {
    const without = generateDefaultBank({ seed: SEED });
    expect(withDefaultCupLegs(without)).toBe(without);
  });
});
