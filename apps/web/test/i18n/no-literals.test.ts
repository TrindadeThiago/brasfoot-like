// @vitest-environment node
// SC-006: nenhuma string visível fora do i18n e nenhuma chave usada que não exista em ui.json.
// 016 R10: nenhuma chave de ui.json sem uso.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { uiKeys } from "@brasfoot-like/i18n";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "..", "src");
const LOCALES = join(import.meta.dirname, "..", "..", "..", "..", "packages", "i18n", "locales");
const TEXT_ATTRIBUTES = new Set(["title", "aria-label", "placeholder", "alt"]);
const TRANSLATORS = new Set(["t", "formatUi"]);
const I18N_SRC = join(import.meta.dirname, "..", "..", "..", "..", "packages", "i18n", "src");
/**
 * Prefixos de chaves montadas em tempo de execução fora de um template literal (ex.: código de
 * erro do motor + sufixo). Prefixos de template (`settings.theme.${theme}`) já são detectados.
 */
const DYNAMIC_PREFIXES: readonly string[] = [
  // Códigos de erro do `createSave` (`SaveErrorCode`), mostrados com `t(error.code)`.
  "save.",
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

interface Finding {
  file: string;
  line: number;
  text: string;
}

interface Scan {
  literals: Finding[];
  keys: Finding[];
  /** Todo texto literal do arquivo (uma chave guardada em dados, como `labelKey`, conta). */
  strings: string[];
  /** Começo fixo de templates (`settings.theme.${theme}` → `settings.theme.`). */
  prefixes: string[];
}

function scan(path: string): Scan {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const file = relative(SRC, path);
  const at = (node: ts.Node, text: string): Finding => ({
    file,
    line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    text,
  });
  const literals: Finding[] = [];
  const keys: Finding[] = [];
  const strings: string[] = [];
  const prefixes: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      strings.push(node.text);
    if (ts.isTemplateExpression(node) && node.head.text) prefixes.push(node.head.text);
    if (ts.isJsxText(node) && /\p{L}/u.test(node.text)) literals.push(at(node, node.text.trim()));
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      const value = ts.isStringLiteral(node.initializer)
        ? node.initializer
        : ts.isJsxExpression(node.initializer) && node.initializer.expression
          ? node.initializer.expression
          : undefined;
      if (value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) {
        if (TEXT_ATTRIBUTES.has(name) && /\p{L}/u.test(value.text))
          literals.push(at(node, `${name}="${value.text}"`));
        if (name === "k") keys.push(at(node, value.text));
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      TRANSLATORS.has(node.expression.text)
    ) {
      const [first] = node.arguments;
      if (first && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first))) {
        keys.push(at(first, first.text));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { literals, keys, strings, prefixes };
}

const results = walk(SRC)
  .filter((path) => /\.tsx?$/.test(path))
  .map(scan);
const i18nResults = walk(I18N_SRC)
  .filter((path) => /\.ts$/.test(path))
  .map(scan);

describe("i18n na interface", () => {
  it("nenhum texto literal em JSX nem em title/aria-label/placeholder/alt", () => {
    expect(results.flatMap((result) => result.literals)).toEqual([]);
  });

  it("toda chave usada existe em ui.json", () => {
    const known = new Set(uiKeys());
    const used = results.flatMap((result) => result.keys);
    expect(used.length).toBeGreaterThan(50);
    expect(used.filter((finding) => !known.has(finding.text))).toEqual([]);
  });

  it("toda chave de ui.json é usada (016 R10)", () => {
    const all = [...results, ...i18nResults];
    const strings = new Set(all.flatMap((result) => result.strings));
    const prefixes = [...all.flatMap((result) => result.prefixes), ...DYNAMIC_PREFIXES];
    const unused = uiKeys().filter(
      (key) => !strings.has(key) && !prefixes.some((prefix) => key.startsWith(prefix)),
    );
    expect(unused).toEqual([]);
  });

  it('nenhum texto visível menciona "brasfoot" (016 FR-038)', () => {
    const found: string[] = [];
    for (const locale of readdirSync(LOCALES)) {
      for (const file of readdirSync(join(LOCALES, locale)).filter((name) =>
        name.endsWith(".json"),
      )) {
        const values = JSON.stringify(
          JSON.parse(readFileSync(join(LOCALES, locale, file), "utf8")),
        );
        for (const match of values.matchAll(/[^"]*brasfoot[^"]*/gi))
          found.push(`${file}: ${match[0]}`);
      }
    }
    expect(found).toEqual([]);
  });
});
