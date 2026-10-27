import { describe, expect, it } from "vitest";
import type { ModPackage } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import { generateRegionalBank } from "../../src/worldgen/regional";

const base = generateRegionalBank({ seed: "calendario-estaduais", states: 2 });

function codes(bank: ModPackage): string[] {
  const result = validateBank(bank);
  return (result.ok ? result.warnings : [...result.errors, ...result.warnings]).map(
    (issue) => issue.code,
  );
}

function clone(): ModPackage {
  return JSON.parse(JSON.stringify(base)) as ModPackage;
}

describe("calendário dos estaduais (023 FR-009, FR-017)", () => {
  it("o estadual termina antes da liga no banco gerado", () => {
    expect(codes(clone())).not.toContain("calendar.regional_after_national");
  });

  it("liga começando durante o estadual é erro", () => {
    const bank = clone();
    const league = bank.competitions.find((entry) => !entry.regional);
    if (league) league.schedule = { ...league.schedule, startWeek: 2 };
    expect(codes(bank)).toContain("calendar.regional_after_national");
  });

  it("clube com dois jogos no mesmo dia entre estadual e liga é erro de calendário", () => {
    const bank = clone();
    const league = bank.competitions.find((entry) => !entry.regional);
    // Mesmo dia da semana e mesma semana inicial: o clube nacional joga duas vezes no mesmo dia.
    if (league) league.schedule = { weekday: 7, startWeek: 0, everyWeeks: 1 };
    const found = codes(bank);
    expect(found).toContain("calendar.club_double_booked");
  });
});
