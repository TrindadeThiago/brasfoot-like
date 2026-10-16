import { IntlMessageFormat } from "intl-messageformat";
import { describe, expect, it } from "vitest";
import ui from "../locales/pt-BR/ui.json" with { type: "json" };
import { formatUi, uiKeys } from "../src/index";

describe("textos da interface (pt-BR)", () => {
  it.each(Object.entries(ui as Record<string, string>))("%s compila", (_, message) => {
    expect(() => new IntlMessageFormat(message, "pt-BR")).not.toThrow();
  });

  it("formata com plural", () => {
    expect(formatUi("squad.suspended", { matches: 1 })).toBe("Suspenso (1 jogo)");
    expect(formatUi("squad.injured", { matches: 3 })).toBe("Lesionado (3 jogos)");
  });

  it("lista as chaves e recusa chave inexistente", () => {
    expect(uiKeys()).toContain("nav.home");
    expect(() => formatUi("nao.existe")).toThrow();
  });
});
