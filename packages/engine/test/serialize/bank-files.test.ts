import { describe, expect, it } from "vitest";
import { BANK_FILES, joinBankFiles, splitBankFiles } from "../../src/serialize/bank-files";
import { validateBank } from "../../src/validation/validate";
import { makeValidBank } from "../helpers/build-bank";

describe("bank-files", () => {
  it("gera um arquivo por seção; as opcionais só quando existem", () => {
    const required = Object.values(BANK_FILES).filter((file) => file !== "rivalries.json");
    expect(Object.keys(splitBankFiles(makeValidBank())).sort()).toEqual(required.sort());
    const withRivalries = {
      ...makeValidBank(),
      rivalries: [{ clubIds: ["clube-1", "clube-2"] as [string, string], intensity: 2 }],
    };
    expect(Object.keys(splitBankFiles(withRivalries)).sort()).toEqual(
      Object.values(BANK_FILES).sort(),
    );
  });

  it("faz ida e volta preservando o banco", () => {
    const bank = makeValidBank();
    const parsed = Object.fromEntries(
      Object.entries(splitBankFiles(bank)).map(([file, content]) => [file, JSON.parse(content)]),
    );
    const joined = joinBankFiles(parsed);
    expect(joined).toEqual(bank);
    expect(validateBank(joined).ok).toBe(true);
  });

  it("omite seções cujo arquivo não foi fornecido", () => {
    expect(joinBankFiles({ "mod.json": {} })).toEqual({ manifest: {} });
  });
});
