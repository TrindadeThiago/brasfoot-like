import { describe, expect, it } from "vitest";
import type { Berth, Competition, ModPackage } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import { clone, superCupWorld } from "../qualification/helpers";

type Edit = (supercup: Competition, bank: ModPackage, berths: Berth[]) => void;

function pack(edit?: Edit): ModPackage {
  const { world } = superCupWorld();
  const bank = clone(world) as unknown as ModPackage;
  const supercup = bank.competitions.find((entry) => entry.id === "supercopa-teste") as Competition;
  edit?.(supercup, bank, supercup.divisions[0]?.berths as Berth[]);
  return bank;
}

function issues(edit?: Edit) {
  const result = validateBank(pack(edit));
  return result.ok ? [] : result.errors;
}

const cases: [string, Edit, string, (string | number)[]][] = [
  [
    "competição inexistente na fonte",
    (_c, _b, berths) => {
      (berths[0] as Berth).source = { kind: "champion", competitionId: "nao-existe" };
    },
    "qualification.unknown_competition",
    [-1, "divisions", 0, "berths", 0, "source", "competitionId"],
  ],
  [
    "divisão inexistente numa posição",
    (_c, _b, berths) => {
      (berths[0] as Berth).source = {
        kind: "position",
        competitionId: sourceId(berths[0]),
        level: 9,
        from: 1,
        to: 1,
      };
    },
    "qualification.unknown_level",
    [-1, "divisions", 0, "berths", 0, "source", "level"],
  ],
  [
    "faixa maior que a divisão",
    (_c, _b, berths) => {
      const id = sourceId(berths[0]);
      (berths[0] as Berth).source = {
        kind: "position",
        competitionId: id,
        level: 1,
        from: 1,
        to: 30,
      };
    },
    "qualification.range_invalid",
    [-1, "divisions", 0, "berths", 0, "source", "to"],
  ],
  [
    "fase alcançada em competição que não é copa",
    (_c, _b, berths) => {
      const id = sourceId(berths[0]);
      (berths[0] as Berth).source = { kind: "reached", competitionId: id, phase: 1 };
    },
    "qualification.reached_not_cup",
    [-1, "divisions", 0, "berths", 0, "source", "competitionId"],
  ],
  [
    "vagas que não fecham com os participantes",
    (c) => {
      (c.divisions[0] as { clubIds: string[] }).clubIds.push("clube-zzz");
    },
    "qualification.count_mismatch",
    [],
  ],
  [
    "repasse sem fechamento",
    (_c, _b, berths) => {
      (berths[0] as Berth).fallback = [];
    },
    "qualification.no_closing",
    [-1, "divisions", 0, "berths", 0, "fallback"],
  ],
  [
    "fechamento que não cobre a tabela inteira",
    (_c, _b, berths) => {
      const id = sourceId(berths[0]);
      (berths[0] as Berth).fallback = [
        { kind: "position", competitionId: id, level: 1, from: 1, to: 3 },
      ];
    },
    "qualification.no_closing",
    [],
  ],
  [
    "fechamento com menos clubes que a divisão de destino",
    (c, _b, berths) => {
      const id = sourceId(berths[0]);
      (c.divisions[0] as { clubIds: string[] }).clubIds.push(
        "x1",
        "x2",
        "x3",
        "x4",
        "x5",
        "x6",
        "x7",
        "x8",
        "x9",
      );
      (berths[0] as Berth).fallback = [
        { kind: "position", competitionId: id, level: 1, from: 1, to: 8 },
      ];
    },
    "qualification.pool_too_small",
    [-1, "divisions", 0, "berths", 0, "fallback", 0],
  ],
  [
    "id de vaga repetido",
    (_c, _b, berths) => {
      (berths[1] as Berth).id = (berths[0] as Berth).id;
    },
    "qualification.duplicate_berth_id",
    [-1, "divisions", 0, "berths", 1, "id"],
  ],
  [
    "condição aponta para divisão inexistente",
    (_c, _b, berths) => {
      const id = sourceId(berths[0]);
      (berths[0] as Berth).require = [{ competitionId: id, level: 7 }];
    },
    "qualification.unknown_level",
    [-1, "divisions", 0, "berths", 0, "require", 0, "level"],
  ],
  [
    "entrada em fase que não existe",
    (_c, _b, berths) => {
      (berths[0] as Berth).entry = { phase: 3 };
    },
    "qualification.unknown_phase",
    [-1, "divisions", 0, "berths", 0, "entry", "phase"],
  ],
];

describe("validação das vagas entre competições (021 FR-020)", () => {
  it("o banco de teste com supercopa é válido", () => {
    expect(issues()).toEqual([]);
  });

  it.each(cases)("%s é recusada com arquivo e campo", (_label, edit, code, path) => {
    const found = issues(edit).filter((issue) => issue.code === code);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]?.section).toBe("competitions");
    const index = pack().competitions.findIndex((entry) => entry.id === "supercopa-teste");
    const wanted = path.map((part) => (part === -1 ? index : part));
    if (wanted.length > 0) expect(found[0]?.path.slice(0, wanted.length)).toEqual(wanted);
  });

  it("ciclo em require/forbid é recusado", () => {
    const bank = pack((_c, mod, berths) => {
      const other = clone(
        mod.competitions.find((entry) => entry.id === "supercopa-teste"),
      ) as Competition;
      other.id = "supercopa-b";
      (other.divisions[0] as Division).berths = clone(berths).map((berth) => ({
        ...berth,
        require: [{ competitionId: "supercopa-teste", level: 1 }],
      }));
      mod.competitions.push(other);
      (berths[0] as Berth).require = [{ competitionId: "supercopa-b", level: 1 }];
    });
    const result = validateBank(bank);
    expect(result.ok ? [] : result.errors.map((issue) => issue.code)).toContain(
      "qualification.cycle",
    );
  });

  it("saída da pirâmide: última divisão rebaixa para fora só com vagas externas somando o mesmo número", () => {
    const withExit = (relegation: number, berthCount: number) =>
      pack((_c, mod) => {
        const league = mod.competitions.find(
          (entry) => entry.countryId === _c.countryId && entry.format.type === "league",
        ) as Competition;
        const bottom = league.divisions[1] as Division;
        bottom.relegationSlots = relegation;
        const extra = Array.from({ length: berthCount }, (_, k) => ({
          id: `ext-${k}`,
          source: {
            kind: "position" as const,
            competitionId: "supercopa-teste",
            level: 1,
            from: 1,
            to: 1,
          },
          fallback: [
            {
              kind: "position" as const,
              competitionId: league.id,
              level: 1,
              from: 1,
              to: league.divisions[0]?.clubIds.length ?? 1,
            },
          ],
        }));
        if (extra.length > 0) bottom.berths = extra;
      });
    const codes = (bank: ModPackage) => {
      const result = validateBank(bank);
      return result.ok ? [] : result.errors.map((issue) => issue.code);
    };
    expect(codes(withExit(2, 2))).not.toContain("qualification.pyramid_exit_mismatch");
    expect(codes(withExit(2, 2))).not.toContain("division.bottom_has_relegation");
    expect(codes(withExit(2, 1))).toContain("qualification.pyramid_exit_mismatch");
    // sem vagas, continua recusado
    expect(codes(withExit(2, 0))).toContain("division.bottom_has_relegation");
  });
});

type Division = Competition["divisions"][number];

function sourceId(berth: Berth | undefined): string {
  return berth ? berth.source.competitionId : "";
}
