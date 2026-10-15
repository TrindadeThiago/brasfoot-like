import { ISSUE_CODES, ISSUE_PARAMS, type IssueCode } from "@brasfoot-like/engine";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import errors from "../locales/pt-BR/errors.json" with { type: "json" };

const MESSAGES = errors as Record<string, string>;
const ALWAYS_AVAILABLE = ["entityId", "section"];

interface AstElement {
  type: number;
  value?: string;
  options?: Record<string, { value: AstElement[] }>;
}

/** Nomes de variáveis usados numa mensagem ICU (argumentos, plural, select). */
function variablesOf(elements: AstElement[], found = new Set<string>()): Set<string> {
  for (const element of elements) {
    // 0 = literal, 7 = pound (#); os demais tipos com `value` são argumentos.
    if (element.type !== 0 && element.type !== 7 && typeof element.value === "string") {
      found.add(element.value);
    }
    for (const option of Object.values(element.options ?? {})) {
      variablesOf(option.value, found);
    }
  }
  return found;
}

describe("mensagens pt-BR dos problemas de validação (SC-006)", () => {
  it("todo código tem mensagem e não há mensagens sobrando", () => {
    expect(ISSUE_CODES.filter((code) => !(code in MESSAGES))).toEqual([]);
    expect(Object.keys(MESSAGES).filter((key) => !ISSUE_CODES.includes(key as IssueCode))).toEqual(
      [],
    );
  });

  it.each(ISSUE_CODES)("%s compila e usa só parâmetros declarados", (code) => {
    const message = MESSAGES[code] ?? "";
    const format = new IntlMessageFormat(message, "pt-BR");
    const allowed = new Set<string>([...ISSUE_PARAMS[code], ...ALWAYS_AVAILABLE]);
    const used = [...variablesOf(format.getAst() as unknown as AstElement[])];
    expect(used.filter((name) => !allowed.has(name))).toEqual([]);
  });
});
