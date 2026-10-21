import { describe, expect, it } from "vitest";
import { validateBank } from "../../src/validation/validate";
import {
  cupPackage,
  entryDuplicate,
  entryNotParticipant,
  entryOutOfRange,
  lateEntryCup,
  neutralTwoLegs,
  noDecider,
  oddPhase,
  twoDivisions,
} from "../fixtures/cup-bank";

function codes(edit?: Parameters<typeof cupPackage>[0]) {
  const result = validateBank(cupPackage(edit));
  return result.ok ? [] : result.errors.map((issue) => issue.code);
}

describe("validação da copa (018 US3)", () => {
  it("a copa de teste e a de entradas tardias são válidas", () => {
    expect(validateBank(cupPackage()).ok).toBe(true);
    expect(validateBank(cupPackage(lateEntryCup)).ok).toBe(true);
  });

  it.each([
    ["fase ímpar", oddPhase, "knockout.phase_count"],
    ["entrada fora do intervalo", entryOutOfRange, "knockout.entry_phase"],
    ["sem critério final", noDecider, "knockout.no_decider"],
    ["neutro em ida e volta", neutralTwoLegs, "knockout.neutral_two_legs"],
    ["duas divisões", twoDivisions, "knockout.single_division"],
    ["entrada duplicada", entryDuplicate, "knockout.entry_duplicate"],
    ["entrada fora da divisão", entryNotParticipant, "knockout.entry_not_participant"],
  ] as const)("%s é recusada", (_, edit, code) => {
    expect(codes(edit)).toContain(code);
  });

  it("phase_count diz a fase e quantos clubes faltam", () => {
    const result = validateBank(cupPackage(oddPhase));
    const issue =
      !result.ok && result.errors.find((entry) => entry.code === "knockout.phase_count");
    expect(issue ? issue.params : undefined).toEqual({ phase: 1, count: 15, delta: 1 });
  });

  it("copa que não cabe na temporada reaproveita calendar.competition_overflow", () => {
    expect(
      codes((cup) => {
        cup.schedule = { weekday: 3, startWeek: 50, everyWeeks: 2 };
      }),
    ).toContain("calendar.competition_overflow");
  });

  it("fase fora do intervalo do schema falha apontando o campo", () => {
    const result = validateBank(
      cupPackage((cup) => {
        if (cup.format.type === "knockout" && cup.format.phases[0])
          cup.format.phases[0].legs = 3 as 1;
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((issue) => issue.path.includes("legs"))).toBe(true);
    }
  });
});
