// @vitest-environment node
// 016 R5 / FR-015 / FR-016 / SC-007: o registro de atalhos é a fonte única e não tem conflitos.
// (Ids usados por `useShortcuts` são verificados pelo TypeScript: `ShortcutId`.)
import { uiKeys } from "@brasfoot-like/i18n";
import { describe, expect, it } from "vitest";
import { type ScreenId, SHORTCUTS, scopesOf, screenOf } from "../../src/ui/shortcuts";

const SCREENS: ScreenId[] = [
  "opening",
  "saves",
  "new-career",
  "mods",
  "settings",
  "about",
  "release-notes",
  "game-home",
  "squad",
  "lineup",
  "competition",
  "calendar",
  "finance",
  "history",
  "market",
  "career",
  "news",
  "round",
  "season-end",
];

describe("registro de atalhos", () => {
  it("ids únicos e textos existentes", () => {
    const ids = SHORTCUTS.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = new Set(uiKeys());
    for (const entry of SHORTCUTS) {
      expect(keys.has(entry.labelKey), entry.labelKey).toBe(true);
      if (entry.display.includes(".")) expect(keys.has(entry.display), entry.display).toBe(true);
    }
  });

  it("nenhuma tecla com duas ações numa mesma tela (FR-016)", () => {
    for (const screen of SCREENS) {
      const active = SHORTCUTS.filter(
        (entry) => scopesOf(screen).includes(entry.scope) && !("passive" in entry && entry.passive),
      );
      const keys = active.flatMap((entry) => entry.keys);
      expect(
        keys.filter((key, index) => keys.indexOf(key) !== index),
        screen,
      ).toEqual([]);
    }
  });

  it("as teclas de sempre mantêm o significado", () => {
    const byKey = (key: string) =>
      SHORTCUTS.filter((entry) => (entry.keys as readonly string[]).includes(key)).map(
        (entry) => entry.id,
      );
    expect(byKey("1")).toEqual(["go-home"]);
    expect(byKey("6")).toEqual(["go-finance"]);
    expect(byKey("h")).toEqual(["go-history"]);
    expect(byKey("m")).toEqual(["go-market"]);
    expect(byKey("c")).toEqual(["go-career"]);
    expect(byKey("j")).toEqual(["go-news"]);
    expect(byKey("s")).toEqual(["play"]);
    expect(byKey("d")).toEqual(["play-direct"]);
    expect(byKey("n")).toEqual(["next-season"]);
    expect(byKey(" ")).toEqual(["pause"]);
    expect(byKey("+")).toEqual(["faster"]);
    expect(byKey("-")).toEqual(["slower"]);
    expect(byKey("f")).toEqual(["finish"]);
    expect(byKey("a")).toEqual(["auto-lineup"]);
    expect(byKey("i")).toEqual(["details"]);
    expect(byKey("[")).toEqual(["division-prev"]);
    expect(byKey("?")).toEqual(["help"]);
  });

  it("rotas viram telas", () => {
    expect(screenOf("/")).toBe("opening");
    expect(screenOf("/jogo/")).toBe("game-home");
    expect(screenOf("/jogo/competicao/resultados/")).toBe("competition");
    expect(screenOf("/jogo/rodada")).toBe("round");
    expect(screenOf("/configuracoes/")).toBe("settings");
    expect(scopesOf("round")).toEqual(["global", "game", "round"]);
    expect(scopesOf("mods")).toEqual(["global", "mods"]);
  });
});
