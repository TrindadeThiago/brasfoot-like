import { describe, expect, it } from "vitest";
import { ISSUE_CODES, severityOf } from "../../src/validation/issues";
import { validateBank } from "../../src/validation/validate";
import { bankFor, RULE_CASES } from "./cases";

describe("cada código de problema tem um caso (SC-003)", () => {
  it("nenhum código sem caso, exceto file.*, package.*, image.* e csv.*", () => {
    const covered = new Set(RULE_CASES.map((ruleCase) => ruleCase.code));
    // Códigos de pacote, imagem e CSV (015) são produzidos e testados no `modkit`.
    const elsewhere = (code: string) => /^(file|package|image|csv)\./.test(code);
    const missing = ISSUE_CODES.filter((code) => !elsewhere(code) && !covered.has(code));
    expect(missing).toEqual([]);
  });
});

describe("regras de validação", () => {
  it.each(RULE_CASES.map((ruleCase) => [`${ruleCase.code} — ${ruleCase.description}`, ruleCase]))(
    "%s",
    (_, ruleCase) => {
      const result = validateBank(bankFor(ruleCase));
      const issues = result.ok ? result.warnings : [...result.errors, ...result.warnings];
      const expected = {
        severity: severityOf(ruleCase.code),
        code: ruleCase.code,
        ...ruleCase.expect,
      };
      expect(issues).toContainEqual(expected);
      expect(result.ok).toBe(expected.severity === "warning");
    },
  );
});
