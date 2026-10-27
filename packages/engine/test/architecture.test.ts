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

  it("a resolução das vagas entre competições (021) não usa PRNG nem importa da interface", () => {
    const dir = join(SRC_DIR, "qualification");
    const problems: string[] = [];
    for (const file of listTsFiles(dir)) {
      const source = stripComments(readFileSync(file, "utf8"));
      if (/\b(createRng|Rng)\b|rng\//.test(source))
        problems.push(`${relative(SRC_DIR, file)} usa PRNG`);
      if (/from\s+"(react|next)|apps\/|document\.|window\./.test(source)) {
        problems.push(`${relative(SRC_DIR, file)} importa da interface`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("as competições entre países (022) não usam PRNG novo nem importam da interface", () => {
    const dir = join(SRC_DIR, "continental");
    const problems: string[] = [];
    for (const file of listTsFiles(dir)) {
      const source = stripComments(readFileSync(file, "utf8"));
      if (/\b(createRng|Rng)\b|rng\//.test(source))
        problems.push(`${relative(SRC_DIR, file)} usa PRNG`);
      if (/from\s+"(react|next)|apps\/|document\.|window\.|localStorage|fetch\(/.test(source)) {
        problems.push(`${relative(SRC_DIR, file)} importa da interface ou da plataforma`);
      }
    }
    expect(listTsFiles(dir).length).toBeGreaterThanOrEqual(10);
    expect(problems).toEqual([]);
  });

  it("os estaduais (023) não usam PRNG novo nem importam da interface", () => {
    const dir = join(SRC_DIR, "regional");
    const problems: string[] = [];
    for (const file of listTsFiles(dir)) {
      const source = stripComments(readFileSync(file, "utf8"));
      if (/\b(createRng|Rng)\b|rng\//.test(source))
        problems.push(`${relative(SRC_DIR, file)} usa PRNG`);
      if (/from\s+"(react|next)|apps\/|document\.|window\.|localStorage|fetch\(/.test(source)) {
        problems.push(`${relative(SRC_DIR, file)} importa da interface ou da plataforma`);
      }
    }
    expect(listTsFiles(dir).length).toBeGreaterThanOrEqual(1);
    expect(problems).toEqual([]);
  });
});
