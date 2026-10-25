import { describe, expect, it } from "vitest";
import type { Berth, ModPackage } from "../../src/model/types";
import { validateBank } from "../../src/validation/validate";
import { cupPackage } from "../fixtures/cup-bank";

function withBerths(berths: unknown[], edit?: (bank: ModPackage) => void) {
  const bank = cupPackage();
  const main = bank.competitions[0];
  const division = main?.divisions[0];
  if (!division) throw new Error("sem divisão");
  (division as { berths?: unknown }).berths = berths;
  edit?.(bank);
  return validateBank(bank);
}

const codes = (result: ReturnType<typeof validateBank>) =>
  result.ok ? [] : result.errors.map((issue) => issue.code);

describe("schema das vagas entre competições (021)", () => {
  it("banco sem vagas segue válido", () => {
    expect(validateBank(cupPackage()).ok).toBe(true);
  });

  it("aceita cada tipo de fonte, entrada, repasse e condições no schema", () => {
    const berth: Berth = {
      id: "v1",
      source: { kind: "position", competitionId: "x", level: 1, from: 1, to: 3 },
      entry: { stage: 1, phase: 2 },
      fallback: [
        { kind: "champion", competitionId: "x" },
        { kind: "runnerUp", competitionId: "x" },
        { kind: "reached", competitionId: "x", phase: 2 },
      ],
      require: [{ competitionId: "x", level: 1 }],
      forbid: [{ competitionId: "x", level: 2 }],
    };
    const result = withBerths([berth]);
    // Só o schema é avaliado aqui: erros de referência são da validação semântica.
    expect(codes(result).filter((code) => code.startsWith("schema."))).toEqual([]);
  });

  it("recusa faixa fora do intervalo e avisa de campo desconhecido", () => {
    const bad = withBerths([
      { id: "v1", source: { kind: "position", competitionId: "x", level: 0, from: 1, to: 3 } },
    ]);
    expect(codes(bad)).toContain("schema.out_of_range");
    const unknown = withBerths([
      { id: "v1", source: { kind: "champion", competitionId: "x" }, extra: 1 },
    ]);
    expect(unknown.warnings.map((issue) => issue.code)).toContain("schema.unknown_field");
  });

  it("copa de uma fase é aceita pelo schema", () => {
    const bank = cupPackage((cup) => {
      if (cup.format.type !== "knockout") throw new Error("não é copa");
      cup.format.phases = cup.format.phases.slice(-1);
      cup.divisions = [
        {
          level: 1,
          name: "Chave",
          clubIds: cup.divisions[0]?.clubIds.slice(0, 2) ?? [],
          promotionSlots: 0,
          relegationSlots: 0,
        },
      ];
    });
    expect(codes(validateBank(bank)).filter((code) => code.startsWith("schema."))).toEqual([]);
  });
});
