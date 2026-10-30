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

// 032 US2 (FR-004): pares dos componentes novos. O realce de linha selecionada (`color-highlight`) e os
// fundos suaves de aviso são translúcidos: o contraste vale sobre o fundo já misturado.
function rgba(selector: string, name: string): [number, number, number, number] {
  const start = CSS.indexOf(`${selector} {`);
  const body = CSS.slice(start, CSS.indexOf("}", start));
  const match = body.match(
    new RegExp(`--${name}:\\s*rgba\\((\\d+),\\s*(\\d+),\\s*(\\d+),\\s*([\\d.]+)\\)`),
  );
  if (!match) throw new Error(`${name} ausente em ${selector}`);
  return [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])];
}

function blend(over: [number, number, number, number], under: string): string {
  const channels = [1, 3, 5].map((index) => Number.parseInt(under.slice(index, index + 2), 16));
  const mixed = channels.map((c, i) =>
    Math.round((over[i] as number) * over[3] + c * (1 - over[3])),
  );
  return `#${mixed.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

const SELECTORS: Record<string, string> = { dark: ":root", light: ':root[data-theme="light"]' };

describe.each(Object.entries(THEMES))(
  "contraste dos componentes novos, tema %s",
  (name, colors) => {
    const selector = SELECTORS[name] as string;
    const highlight = rgba(selector, "color-highlight");

    it("texto e texto secundário sobre a linha destacada (realce sobre cada fundo) ≥ 4,5:1; tons de cor sobre superfície e fundo da página", () => {
      // Linhas destacadas ficam em tabelas dentro de cartões (superfície) ou no fundo da página; o
      // verde, o âmbar e os demais tons só aparecem sobre elas em cartões, e o axe confere as telas reais.
      const failing: (string | number)[][] = [];
      for (const surface of SURFACES) {
        const under = blend(highlight, colors[surface] ?? "");
        for (const fg of ["color-text", "color-muted"]) {
          const ratio = contrast(colors[fg] ?? "", under);
          if (ratio < 4.5) failing.push([fg, `${surface}+realce`, ratio.toFixed(2)]);
        }
      }
      for (const fg of TEXT) {
        const ratio = contrast(colors[fg] ?? "", blend(highlight, colors["color-surface"] ?? ""));
        if (ratio < 4.5) failing.push([fg, "color-surface+realce", ratio.toFixed(2)]);
      }
      expect(failing).toEqual([]);
    });

    it("selos e avisos: tons de texto sobre superfície e sobre superfície 2 ≥ 4,5:1, contorno do selo ≥ 3:1", () => {
      const tones = ["color-muted", "color-accent", "color-info", "color-warning", "color-danger"];
      const failing: (string | number)[][] = [];
      for (const surface of ["color-surface", "color-surface-2"]) {
        for (const tone of tones) {
          // O selo usa `currentColor` no texto e na borda: vale o texto (4,5:1), que também cobre a borda (3:1).
          const ratio = contrast(colors[tone] ?? "", colors[surface] ?? "");
          if (ratio < 4.5) failing.push([tone, surface, ratio.toFixed(2)]);
        }
      }
      expect(failing).toEqual([]);
    });

    it("cartão amarelo ≥ 3:1 sobre o gramado do campo, igual nos dois temas (o vermelho tem 2,4 a 2,9:1, mas o cartão sempre vem com texto, então a cor não é o único sinal)", () => {
      const failing = ["card-yellow"]
        .flatMap((token) =>
          ["pitch-grass-1", "pitch-grass-2"].map((surface) => [token, surface] as const),
        )
        .map(([token, surface]) => [
          token,
          surface,
          contrast(colors[token] ?? "", colors[surface] ?? "").toFixed(2),
        ])
        .filter(([, , ratio]) => Number(ratio) < 3);
      expect(failing).toEqual([]);
    });
  },
);
