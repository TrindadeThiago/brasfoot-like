import { describe, expect, it } from "vitest";
import type { ModPackage } from "../../src/model/types";
import { joinBankFiles, splitBankFiles } from "../../src/serialize/bank-files";
import { validateBank } from "../../src/validation/validate";
import { makeValidBank } from "../helpers/build-bank";

function withRivalries(rivalries: unknown): unknown {
  return { ...makeValidBank(), rivalries };
}

function codes(input: unknown) {
  const result = validateBank(input);
  return result.ok ? [] : result.errors.map((issue) => ({ code: issue.code, path: issue.path }));
}

describe("rivalidades no formato de mod (013 R1, critério de aceite 2, SC-003)", () => {
  it("rivalidades válidas carregam e ficam no banco", () => {
    const result = validateBank(
      withRivalries([
        { clubIds: ["clube-1", "clube-2"], intensity: 3 },
        { clubIds: ["clube-1", "clube-5"], intensity: 1 },
      ]),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bank.rivalries).toHaveLength(2);
  });

  it("sem a seção: válido e sem rivalidades", () => {
    const result = validateBank(makeValidBank());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.bank.rivalries).toBeUndefined();
  });

  it("clube inexistente é rejeitado no campo certo", () => {
    expect(codes(withRivalries([{ clubIds: ["clube-1", "clube-99"], intensity: 2 }]))).toEqual([
      { code: "ref.club_not_found", path: [0, "clubIds", 1] },
    ]);
  });

  it("mesmo clube e par repetido são rejeitados", () => {
    expect(codes(withRivalries([{ clubIds: ["clube-2", "clube-2"], intensity: 2 }]))).toEqual([
      { code: "rivalry.same_club", path: [0, "clubIds"] },
    ]);
    expect(
      codes(
        withRivalries([
          { clubIds: ["clube-1", "clube-2"], intensity: 2 },
          { clubIds: ["clube-2", "clube-1"], intensity: 2 },
        ]),
      ),
    ).toEqual([{ code: "rivalry.duplicate_pair", path: [1, "clubIds"] }]);
  });

  it("intensidade fora de 1–3 é rejeitada", () => {
    for (const intensity of [0, 4]) {
      expect(
        codes(withRivalries([{ clubIds: ["clube-1", "clube-2"], intensity }])).map(
          (issue) => issue.code,
        ),
      ).toEqual(["schema.out_of_range"]);
    }
  });

  it("ida e volta pelos arquivos preserva as rivalidades", () => {
    const bank = withRivalries([{ clubIds: ["clube-1", "clube-2"], intensity: 3 }]) as ModPackage;
    const files = Object.fromEntries(
      Object.entries(splitBankFiles(bank)).map(([file, content]) => [file, JSON.parse(content)]),
    );
    expect(files["rivalries.json"]).toEqual(bank.rivalries);
    expect(joinBankFiles(files)).toEqual(bank);
  });
});
