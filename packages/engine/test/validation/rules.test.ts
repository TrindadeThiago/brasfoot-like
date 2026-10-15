import { describe, expect, it } from "vitest";
import { ISSUE_CODES, severityOf } from "../../src/validation/issues.js";
import { validateBank } from "../../src/validation/validate.js";
import { bankFor, RULE_CASES } from "./cases.js";

describe("cada código de problema tem um caso (SC-003)", () => {
  it("nenhum código sem caso, exceto file.*", () => {
    const covered = new Set(RULE_CASES.map((ruleCase) => ruleCase.code));
    const missing = ISSUE_CODES.filter((code) => !code.startsWith("file.") && !covered.has(code));
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
