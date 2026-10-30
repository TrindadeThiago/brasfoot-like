// @vitest-environment node
// 032 US4 (FR-011, R7): auditoria dos estilos. Cores só nos tokens, espaçamentos e fontes pelos tokens
// que já existem, sem `!important` fora da regra de movimento reduzido e sem classe declarada que
// nenhum componente usa.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../../src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const FILES = walk(SRC);
const MODULES = FILES.filter((file) => file.endsWith(".module.css"));
const SOURCES = FILES.filter((file) => /\.(tsx|ts)$/.test(file));

/** Linhas de um CSS sem comentários, com o número da linha. */
function lines(file: string): { text: string; number: number }[] {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
  return css.split("\n").map((text, index) => ({ text, number: index + 1 }));
}

const where = (file: string, line: number) => `${relative(SRC, file)}:${line}`;

// Valores em px que já têm token (`tokens.css`): espaços de 4 a 32 e tamanhos de texto.
const SPACING_PX = new Set([4, 8, 12, 16, 24, 32]);
const FONT_PX = new Set([13, 15, 18, 24]);

describe("auditoria dos estilos (032)", () => {
  it("nenhuma cor literal fora de tokens.css (os módulos usam var(--…))", () => {
    const found: string[] = [];
    for (const file of MODULES) {
      for (const { text, number } of lines(file)) {
        if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(text))
          found.push(`${where(file, number)}: ${text.trim()}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("espaçamento e tamanho de fonte que já são token não vêm em px solto", () => {
    const found: string[] = [];
    for (const file of MODULES) {
      for (const { text, number } of lines(file)) {
        const spacing = text.match(/^\s*(padding|margin|gap|row-gap|column-gap)[\w-]*:\s*([^;]+);/);
        if (spacing) {
          const px = [...(spacing[2] ?? "").matchAll(/(?<![\w.-])(\d+)px/g)].map((m) =>
            Number(m[1]),
          );
          if (!/calc\(/.test(spacing[2] ?? "") && px.some((value) => SPACING_PX.has(value)))
            found.push(`${where(file, number)}: ${text.trim()}`);
        }
        const font = text.match(/^\s*font-size:\s*(\d+)px/);
        if (font && FONT_PX.has(Number(font[1])))
          found.push(`${where(file, number)}: ${text.trim()}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("sem !important fora da regra de movimento reduzido", () => {
    const found: string[] = [];
    for (const file of FILES.filter((entry) => entry.endsWith(".css"))) {
      const reduced = file.endsWith("styles/global.css");
      for (const { text, number } of lines(file)) {
        if (text.includes("!important") && !reduced)
          found.push(`${where(file, number)}: ${text.trim()}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("toda classe declarada num módulo é usada por algum componente", () => {
    const sources = SOURCES.map((file) => readFileSync(file, "utf8"));
    const found: string[] = [];
    for (const file of MODULES) {
      const name = file.slice(file.lastIndexOf("/") + 1);
      const importers = SOURCES.filter((_, index) => (sources[index] ?? "").includes(name));
      if (importers.length === 0) {
        found.push(`${relative(SRC, file)}: módulo que nenhum arquivo importa`);
        continue;
      }
      const usage = importers.map((importer) => readFileSync(importer, "utf8")).join("\n");
      const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const classes = new Set([...css.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map((m) => m[1] as string));
      for (const cls of classes) {
        // Usada como `styles.cls`, `styles["cls"]`, ou montada dinamicamente (`styles[tone]`): se o
        // módulo é indexado por variável, a classe pode ser dinâmica e não é acusada.
        const direct = new RegExp(`\\.${cls}\\b|\\["${cls}"\\]|'${cls}'|"${cls}"`).test(usage);
        const dynamic = /styles\[(?!["'])/.test(usage) || /\bstyles\[`/.test(usage);
        if (!direct && !dynamic) found.push(`${relative(SRC, file)}: .${cls} sem uso`);
      }
    }
    expect(found).toEqual([]);
  });
});
