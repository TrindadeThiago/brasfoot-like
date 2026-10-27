import { describe, expect, it } from "vitest";
import type { ModPackage } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import { generateRegionalBank } from "../../src/worldgen/regional";

const base = generateRegionalBank({ seed: "validacao-estaduais", states: 2 });

function clone(): ModPackage {
  return JSON.parse(JSON.stringify(base)) as ModPackage;
}

function codes(bank: ModPackage): string[] {
  const result = validateBank(bank);
  return (result.ok ? result.warnings : [...result.errors, ...result.warnings]).map(
    (issue) => issue.code,
  );
}

function estadual(bank: ModPackage, position = 1) {
  const competition = bank.competitions.filter((entry) => entry.regional)[position - 1];
  if (!competition) throw new Error("sem estadual");
  return competition;
}

describe("validação dos estaduais (023 US4)", () => {
  it("o banco gerado passa sem erros nem avisos", () => {
    expect(codes(clone())).toEqual([]);
  });

  it("estadual sem país", () => {
    const bank = clone();
    delete (estadual(bank) as { countryId?: string }).countryId;
    expect(codes(bank)).toContain("regional.needs_country");
  });

  it("estadual que não tem exatamente duas divisões", () => {
    const bank = clone();
    estadual(bank).divisions = estadual(bank).divisions.slice(0, 1);
    expect(codes(bank)).toContain("regional.divisions_count");
  });

  it("divisão sem grupos seguidos de mata-mata, ou final sem ida e volta", () => {
    const shape = clone();
    const first = estadual(shape).divisions[0];
    if (first) first.stages = (first.stages ?? []).slice(0, 1);
    expect(codes(shape)).toContain("regional.stages_missing");

    const legs = clone();
    const stages = estadual(legs).divisions[1]?.stages;
    const knockout = stages?.[1];
    if (knockout?.type === "knockout") {
      const final = knockout.phases.at(-1);
      if (final) final.legs = 1;
    }
    expect(codes(legs)).toContain("regional.stages_missing");
  });

  it("clube de outra região, de outro país ou sem região", () => {
    const region = clone();
    const regionClub = region.clubs.find(
      (club) => club.id === estadual(region).divisions[0]?.clubIds[0],
    );
    if (regionClub) regionClub.region = "Outra";
    expect(codes(region)).toContain("regional.club_region");

    const missing = clone();
    const other = missing.clubs.find((club) => club.region !== undefined);
    if (other) delete (other as { region?: string }).region;
    expect(codes(missing)).toContain("regional.club_without_region");
  });

  it("duas competições para a mesma região do mesmo país", () => {
    const bank = clone();
    const [first, second] = bank.competitions.filter((entry) => entry.regional);
    if (first?.regional && second?.regional) second.regional.region = first.regional.region;
    expect(codes(bank)).toContain("regional.duplicate_region");
  });

  it("peso por reputação fora de ordem crescente", () => {
    const bank = clone();
    const regional = estadual(bank).regional;
    if (regional) {
      regional.weight = {
        pct: 100,
        byReputation: [
          { from: 60, pct: 40 },
          { from: 40, pct: 80 },
        ],
      };
    }
    expect(codes(bank)).toContain("regional.weight_order");
  });

  it("grupos e fases que não fecham com o número de clubes (regras gerais de fases)", () => {
    const bank = clone();
    const first = estadual(bank).divisions[0];
    first?.clubIds.pop();
    expect(codes(bank)).toEqual(expect.arrayContaining(["stages.group_size_mismatch"]));
  });

  it("vagas de acesso e rebaixamento diferentes (regras gerais de divisão)", () => {
    const mismatch = clone();
    const first = estadual(mismatch).divisions[0];
    if (first) first.relegationSlots = 3;
    expect(codes(mismatch)).toContain("division.slots_mismatch");

    const excess = clone();
    const firstDivision = estadual(excess).divisions[0];
    const second = estadual(excess).divisions[1];
    if (firstDivision && second) {
      firstDivision.relegationSlots = 6;
      second.promotionSlots = 6;
    }
    expect(codes(excess)).toContain("stages.relegation_exceeds_eliminated");
  });

  it("promoção maior que o mata-mata", () => {
    const bank = clone();
    const first = estadual(bank).divisions[0];
    const second = estadual(bank).divisions[1];
    if (first && second) {
      first.relegationSlots = 5;
      second.promotionSlots = 5;
    }
    expect(codes(bank)).toContain("regional.promotion_exceeds_knockout");
  });
});
