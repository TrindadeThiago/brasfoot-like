import { describe, expect, it } from "vitest";
import errors from "../../../i18n/locales/pt-BR/errors.json" with { type: "json" };
import { ISSUE_CODES } from "../../src/validation/issues";
import { validateBank } from "../../src/validation/validate";
import { bankFor, RULE_CASES } from "./cases";

const messages = errors as Record<string, string>;
const continentalCases = RULE_CASES.filter((ruleCase) => ruleCase.code.startsWith("continental."));

describe("matriz dos erros continentais (022 US5, FR-025)", () => {
  it("todo código continental tem caso, mensagem e parâmetros que a mensagem usa", () => {
    const codes = ISSUE_CODES.filter((code) => code.startsWith("continental."));
    expect(codes.length).toBeGreaterThanOrEqual(12);
    expect(new Set(continentalCases.map((ruleCase) => ruleCase.code))).toEqual(new Set(codes));
    for (const code of codes) expect(messages[code], code).toBeDefined();
  });

  it.each(continentalCases.map((ruleCase) => [ruleCase.code, ruleCase] as const))(
    "%s: indica arquivo e campo e preenche a mensagem",
    (_code, ruleCase) => {
      const result = validateBank(bankFor(ruleCase));
      const issues = result.ok ? result.warnings : [...result.errors, ...result.warnings];
      const issue = issues.find((entry) => entry.code === ruleCase.code);
      expect(issue).toBeDefined();
      // Arquivo (seção) e campo (caminho começando pelo índice da competição).
      expect(issue?.section).toBe("competitions");
      expect(typeof issue?.path[0]).toBe("number");
      expect(issue?.entityId).toBeDefined();
      // Todo {parâmetro} da mensagem chega preenchido.
      const placeholders = [...(messages[ruleCase.code] ?? "").matchAll(/\{(\w+)[,}]/g)].map(
        (match) => match[1] as string,
      );
      for (const name of placeholders) expect(issue?.params, name).toHaveProperty(name);
    },
  );

  it("um banco válido, sem nada novo, segue válido", () => {
    const valid = RULE_CASES.length > 0 && validateBank(bankFor({ mutate() {} } as never)).ok;
    expect(valid).toBe(true);
  });
});
