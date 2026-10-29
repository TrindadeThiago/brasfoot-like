// @vitest-environment node
// 016 FR-017 / SC-003: contraste mínimo (WCAG 2.x) dos tokens de cor nos temas escuro e claro.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(join(import.meta.dirname, "../../src/styles/tokens.css"), "utf8");

/** Variáveis `--color-*`/`--focus-color` de um bloco do arquivo. */
function block(selector: string): Record<string, string> {
  const start = CSS.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`bloco ${selector} ausente`);
  const body = CSS.slice(start, CSS.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, name, value]) => [
      name as string,
      (value as string).toLowerCase(),
    ]),
  );
}

const dark = block(":root");
const THEMES = { dark, light: { ...dark, ...block(':root[data-theme="light"]') } };

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r as number) + 0.7152 * (g as number) + 0.0722 * (b as number);
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

// 025: a barra lateral (`color-sidebar`) e o tom de informação (`color-info`) entram nos pares.
const SURFACES = ["color-bg", "color-sidebar", "color-surface", "color-surface-2"];
/** Texto normal: ≥ 4,5:1 sobre os fundos. */
const TEXT = [
  "color-text",
  "color-muted",
  "color-accent",
  "color-danger",
  "color-warning",
  "color-info",
];
/** Texto sobre cor de destaque (botão primário, fichas de forma, cartão vermelho). */
const ON = [
  ["color-on-accent", "color-accent"],
  ["color-on-accent", "color-accent-strong"],
  ["color-on-accent", "color-win"],
  ["color-on-accent", "color-draw"],
  ["color-on-accent", "color-loss"],
  ["color-on-danger", "color-danger"],
];
/** Elementos gráficos e contornos de controles: ≥ 3:1 (WCAG 1.4.11). */
const GRAPHIC = ["color-control-border", "focus-color", "color-win", "color-draw", "color-loss"];

describe.each(Object.entries(THEMES))("contraste do tema %s", (_name, colors) => {
  const pairs = (fg: string[], bg: string[]) => fg.flatMap((f) => bg.map((b) => [f, b] as const));

  it("tem todos os tokens", () => {
    for (const name of [...SURFACES, ...TEXT, ...GRAPHIC, "color-on-accent", "color-on-danger"]) {
      expect(colors[name], name).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("texto ≥ 4,5:1 sobre os fundos", () => {
    const failing = pairs(TEXT, SURFACES)
      .map(([f, b]) => [f, b, contrast(colors[f] ?? "", colors[b] ?? "").toFixed(2)])
      .filter(([, , ratio]) => Number(ratio) < 4.5);
    expect(failing).toEqual([]);
  });

  it("texto sobre cores de destaque ≥ 4,5:1", () => {
    const failing = ON.map(([f, b]) => [
      f,
      b,
      contrast(colors[f as string] ?? "", colors[b as string] ?? "").toFixed(2),
    ]).filter(([, , ratio]) => Number(ratio) < 4.5);
    expect(failing).toEqual([]);
  });

  it("contornos de controles, foco e fichas ≥ 3:1", () => {
    const failing = pairs(GRAPHIC, SURFACES)
      .map(([f, b]) => [f, b, contrast(colors[f] ?? "", colors[b] ?? "").toFixed(2)])
      .filter(([, , ratio]) => Number(ratio) < 3);
    expect(failing).toEqual([]);
  });
});
