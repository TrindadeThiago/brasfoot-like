import { describe, expect, it } from "vitest";
import type { ModPackage } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import { cupPackage } from "../fixtures/cup-bank";

const schemaCodes = (bank: ModPackage) => {
  const result = validateBank(bank);
  return result.ok
    ? []
    : result.errors.map((issue) => issue.code).filter((code) => code.startsWith("schema."));
};

function edited(edit: (bank: ModPackage) => void): ModPackage {
  const bank = cupPackage();
  edit(bank);
  return bank;
}

const secondary = (bank: ModPackage) => {
  const competition = bank.competitions[1];
  if (!competition) throw new Error("fixture sem competição secundária");
  return competition;
};

describe("schema das competições entre países (022)", () => {
  it("banco sem nada novo segue válido", () => {
    expect(validateBank(cupPackage()).ok).toBe(true);
  });

  it("aceita competição sem countryId", () => {
    const bank = edited((entry) => {
      delete (secondary(entry) as { countryId?: string }).countryId;
    });
    expect(schemaCodes(bank)).toEqual([]);
  });

  it("aceita awards completos e recusa valores fora da faixa", () => {
    const valid = edited((entry) => {
      secondary(entry).awards = {
        win: 100,
        draw: 50,
        stage: [
          { stage: 1, amount: 10 },
          { stage: 2, phase: 3, amount: 20 },
        ],
        title: 1000,
        reputation: [
          { reached: { stage: 2 }, points: 1 },
          { reached: { stage: 3, phase: 4 }, points: 5 },
        ],
        reputationCeiling: 90,
      };
    });
    expect(schemaCodes(valid)).toEqual([]);

    const ceiling = edited((entry) => {
      secondary(entry).awards = { reputationCeiling: 20 };
    });
    expect(schemaCodes(ceiling)).toContain("schema.out_of_range");

    const points = edited((entry) => {
      secondary(entry).awards = { reputation: [{ reached: { stage: 1 }, points: 9 }] };
    });
    expect(schemaCodes(points)).toContain("schema.out_of_range");

    const negative = edited((entry) => {
      secondary(entry).awards = { win: -1 };
    });
    expect(schemaCodes(negative)).toContain("schema.out_of_range");
  });

  it("aceita dropIns com cada tipo de fonte e recusa faixa inválida", () => {
    const valid = edited((entry) => {
      const division = secondary(entry).divisions[0];
      if (!division) throw new Error("sem divisão");
      division.dropIns = [
        {
          id: "terceiros",
          source: { kind: "position", competitionId: "x", stage: 2, from: 3, to: 3 },
          entry: { stage: 1 },
        },
        {
          id: "perdedores",
          source: { kind: "eliminated", competitionId: "x", stage: 1, phase: 1 },
          entry: { stage: 2, phase: 2 },
        },
      ];
    });
    expect(schemaCodes(valid)).toEqual([]);

    const bad = edited((entry) => {
      const division = secondary(entry).divisions[0];
      if (!division) throw new Error("sem divisão");
      division.dropIns = [
        {
          id: "ruim",
          source: { kind: "position", competitionId: "x", stage: 0, from: 3, to: 3 },
          entry: { stage: 1 },
        },
      ];
    });
    expect(schemaCodes(bad)).toContain("schema.out_of_range");
  });

  it("aceita as regras de torcida, diretoria e manchetes da competição", () => {
    const bank = edited((entry) => {
      const main = entry.competitions[0];
      if (!main) throw new Error("sem principal");
      main.fans = { continentalMatchPct: 150, continentalExpectation: 5, continentalTitle: 20 };
      main.board = {
        continentalTopPct: 34,
        continentalMidPct: 67,
        continentalMet: 4,
        continentalMiss: 4,
      };
      main.news = { relevance: { continentalChampion: 80 } };
    });
    expect(schemaCodes(bank)).toEqual([]);
  });
});
