import {
  MARKET_ERROR_CODES,
  MARKET_ERROR_PARAMS,
  type MarketErrorCode,
} from "@brasfoot-like/engine";
import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import marketErrors from "../locales/pt-BR/market-errors.json" with { type: "json" };

const MESSAGES = marketErrors as Record<string, string>;

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

describe("mensagens pt-BR dos erros do mercado (010)", () => {
  it("todo código tem mensagem e não há mensagens sobrando", () => {
    expect(MARKET_ERROR_CODES.filter((code) => !(code in MESSAGES))).toEqual([]);
    expect(
      Object.keys(MESSAGES).filter((key) => !MARKET_ERROR_CODES.includes(key as MarketErrorCode)),
    ).toEqual([]);
  });

  it.each(MARKET_ERROR_CODES)("%s compila e usa só parâmetros declarados", (code) => {
    const format = new IntlMessageFormat(MESSAGES[code] ?? "", "pt-BR");
    const allowed = new Set<string>([...MARKET_ERROR_PARAMS[code]]);
    const used = [...variablesOf(format.getAst() as unknown as AstElement[])];
    expect(used.filter((name) => !allowed.has(name))).toEqual([]);
  });
});
