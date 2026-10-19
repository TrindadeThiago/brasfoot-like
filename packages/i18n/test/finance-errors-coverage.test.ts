import {
  FINANCE_ERROR_CODES,
  FINANCE_ERROR_PARAMS,
  type FinanceErrorCode,
} from "@brasfoot-like/engine";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import financeErrors from "../locales/pt-BR/finance-errors.json" with { type: "json" };

const MESSAGES = financeErrors as Record<string, string>;

interface AstElement {
  type: number;
  value?: string;
  options?: Record<string, { value: AstElement[] }>;
}

function variablesOf(elements: AstElement[], found = new Set<string>()): Set<string> {
  for (const element of elements) {
    if (element.type !== 0 && element.type !== 7 && typeof element.value === "string") {
      found.add(element.value);
    }
    for (const option of Object.values(element.options ?? {})) variablesOf(option.value, found);
  }
  return found;
}

describe("mensagens pt-BR dos erros financeiros (008)", () => {
  it("todo código tem mensagem e não há mensagens sobrando", () => {
    expect(FINANCE_ERROR_CODES.filter((code) => !(code in MESSAGES))).toEqual([]);
    expect(
      Object.keys(MESSAGES).filter((key) => !FINANCE_ERROR_CODES.includes(key as FinanceErrorCode)),
    ).toEqual([]);
  });

  it.each(FINANCE_ERROR_CODES)("%s compila e usa só parâmetros declarados", (code) => {
    const format = new IntlMessageFormat(MESSAGES[code] ?? "", "pt-BR");
    const allowed = new Set<string>([...FINANCE_ERROR_PARAMS[code]]);
    const used = [...variablesOf(format.getAst() as unknown as AstElement[])];
    expect(used.filter((name) => !allowed.has(name))).toEqual([]);
  });
});
