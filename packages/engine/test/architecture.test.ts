import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Princípios I e II: o código do motor não pode usar fontes não determinísticas nem funções
// matemáticas cujo resultado varia entre engines JavaScript (research.md R4/R15).
const SRC_DIR = join(import.meta.dirname, "..", "src");

const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bMath\.random\b/, reason: "Math.random (use o PRNG com seed)" },
  {
    pattern:
      /\bMath\.(log|log2|log10|log1p|exp|expm1|pow|sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|cbrt|hypot)\b/,
    reason: "função transcendental (resultado varia entre engines)",
  },
  { pattern: /\bnew\s+Date\b/, reason: "new Date (use o calendário do jogo)" },
  { pattern: /\bDate\./, reason: "Date (use o calendário do jogo)" },
  { pattern: /\bperformance\./, reason: "performance (fonte não determinística)" },
  { pattern: /\*\*/, reason: "operador ** (use multiplicação explícita)" },
];

function listTsFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .map((file) => join(dir, file));
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/.*$/gm, "");
}

describe("fronteira do motor", () => {
  it("não usa APIs não determinísticas em packages/engine/src", () => {
    const violations: string[] = [];
    for (const file of listTsFiles(SRC_DIR)) {
      const lines = stripComments(readFileSync(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        for (const { pattern, reason } of FORBIDDEN) {
          if (pattern.test(line)) {
            violations.push(`${relative(SRC_DIR, file)}:${index + 1} — ${reason}`);
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });
});
