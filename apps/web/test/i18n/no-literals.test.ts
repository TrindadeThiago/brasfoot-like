// @vitest-environment node
// SC-006: nenhuma string visível fora do i18n e nenhuma chave usada que não exista em ui.json.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { uiKeys } from "@brasfoot-like/i18n";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "..", "src");
const TEXT_ATTRIBUTES = new Set(["title", "aria-label", "placeholder", "alt"]);
const TRANSLATORS = new Set(["t", "formatUi"]);

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

function scan(path: string): { literals: Finding[]; keys: Finding[] } {
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
  const visit = (node: ts.Node) => {
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
  return { literals, keys };
}

const results = walk(SRC)
  .filter((path) => /\.tsx?$/.test(path))
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
});
