import { describe, expect, it } from "vitest";
import type { ValidationIssue } from "../../src/validation/issues";
import { validateBank } from "../../src/validation/validate";
import { generateDefaultBank } from "../../src/worldgen/generate";
import {
  outsideMain,
  overflow,
  sameWeekday,
  TOURNAMENT_ID,
  twoCompetitionsPackage,
} from "../fixtures/two-competitions";

function errorsOf(bank: unknown): ValidationIssue[] {
  const result = validateBank(bank);
  return result.ok ? [] : result.errors;
}

describe("validação do calendário do banco (017 FR-006 a FR-008)", () => {
  it("o banco padrão e o banco de duas competições são válidos", () => {
    expect(errorsOf(generateDefaultBank({ seed: "brasfoot-like-default-1" }))).toEqual([]);
    expect(errorsOf(twoCompetitionsPackage())).toEqual([]);
  });

  it("clubes em comum entre competições deixam de ser erro", () => {
    const codes = errorsOf(twoCompetitionsPackage()).map((issue) => issue.code);
    expect(codes).not.toContain("division.club_in_multiple");
  });

  it("mesmo dia da semana com clubes em comum ⇒ club_double_booked com as competições, o clube e a data", () => {
    expect(errorsOf(twoCompetitionsPackage(sameWeekday))).toEqual([
      {
        severity: "error",
        code: "calendar.club_double_booked",
        section: "competitions",
        path: [1, "schedule"],
        entityId: TOURNAMENT_ID,
        params: {
          competitionId: TOURNAMENT_ID,
          otherCompetitionId: "liga-nacional",
          clubId: "clube-001",
          date: "2027-01-10",
        },
      },
    ]);
  });

  it("competição que não cabe na temporada ⇒ competition_overflow", () => {
    expect(errorsOf(twoCompetitionsPackage(overflow))).toEqual([
      expect.objectContaining({
        code: "calendar.competition_overflow",
        entityId: TOURNAMENT_ID,
        params: { competitionId: TOURNAMENT_ID, needed: 75, available: 52 },
      }),
    ]);
  });

  it("clube da secundária fora da principal ⇒ club_outside_main no clube e na divisão", () => {
    expect(errorsOf(twoCompetitionsPackage(outsideMain))).toEqual([
      expect.objectContaining({
        code: "competition.club_outside_main",
        path: [1, "divisions", 0, "clubIds", 10],
        params: { clubId: "clube-040", competitionId: TOURNAMENT_ID },
      }),
    ]);
  });

  it.each([
    ["weekday", 0, [1, "schedule", "weekday"]],
    ["weekday", 8, [1, "schedule", "weekday"]],
    ["startWeek", 52, [1, "schedule", "startWeek"]],
    ["everyWeeks", 0, [1, "schedule", "everyWeeks"]],
    ["everyWeeks", 5, [1, "schedule", "everyWeeks"]],
  ])("schedule.%s = %s fora do intervalo ⇒ erro de esquema no campo", (field, value, path) => {
    const bank = twoCompetitionsPackage((tournament) => {
      tournament.schedule = { ...tournament.schedule, [field]: value };
    });
    const issues = errorsOf(bank);
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: "schema.out_of_range",
        section: "competitions",
        path,
      }),
    );
  });
});
