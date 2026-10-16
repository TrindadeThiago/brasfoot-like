import {
  SEASON_ERROR_CODES,
  SEASON_ERROR_PARAMS,
  type SeasonErrorCode,
} from "@brasfoot-like/engine";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import seasonErrors from "../locales/pt-BR/season-errors.json" with { type: "json" };

const MESSAGES = seasonErrors as Record<string, string>;

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

describe("mensagens pt-BR dos erros de temporada (SC-006)", () => {
  it("todo código tem mensagem e não há mensagens sobrando", () => {
    expect(SEASON_ERROR_CODES.filter((code) => !(code in MESSAGES))).toEqual([]);
    expect(
      Object.keys(MESSAGES).filter((key) => !SEASON_ERROR_CODES.includes(key as SeasonErrorCode)),
    ).toEqual([]);
  });

  it.each(SEASON_ERROR_CODES)("%s compila e usa só parâmetros declarados", (code) => {
    const format = new IntlMessageFormat(MESSAGES[code] ?? "", "pt-BR");
    const allowed = new Set<string>([...SEASON_ERROR_PARAMS[code]]);
    const used = [...variablesOf(format.getAst() as unknown as AstElement[])];
    expect(used.filter((name) => !allowed.has(name))).toEqual([]);
  });
});
