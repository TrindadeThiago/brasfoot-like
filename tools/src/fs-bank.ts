import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BANK_FILES,
  type ModPackage,
  makeIssue,
  OPTIONAL_SECTIONS,
  type Section,
  splitBankFiles,
  type ValidationIssue,
} from "@brasfoot-like/engine";

/** Raiz do repositório (tools/src → ../..). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Resolve caminhos passados na linha de comando a partir de onde o usuário rodou o pnpm. */
export function resolveUserPath(path: string): string {
  return resolve(process.env.INIT_CWD ?? process.cwd(), path);
}

export interface ReadBankResult {
  files: Record<string, unknown>;
  issues: ValidationIssue[];
}

function lineAndColumn(text: string, message: string): { line: number; column: number } {
  const explicit = /line (\d+) column (\d+)/.exec(message);
  if (explicit) {
    return { line: Number(explicit[1]), column: Number(explicit[2]) };
  }
  const position = /position (\d+)/.exec(message);
  if (!position) {
    return { line: 1, column: 1 };
  }
  const before = text.slice(0, Number(position[1])).split("\n");
  return { line: before.length, column: (before[before.length - 1]?.length ?? 0) + 1 };
}

/** Lê um diretório de mod; arquivos ausentes ou com JSON malformado viram problemas `file.*`. */
export function readBankDir(dir: string): ReadBankResult {
  const files: Record<string, unknown> = {};
  const issues: ValidationIssue[] = [];
  for (const [section, file] of Object.entries(BANK_FILES) as [Section, string][]) {
    const path = join(dir, file);
    if (!existsSync(path)) {
      // Seções opcionais (rivalidades, 013) podem faltar.
      if (!OPTIONAL_SECTIONS.includes(section)) {
        issues.push(makeIssue("file.missing", section, [], { file }));
      }
      continue;
    }
    const text = readFileSync(path, "utf8");
    try {
      files[file] = JSON.parse(text);
    } catch (error) {
      const { line, column } = lineAndColumn(text, (error as Error).message);
      issues.push(makeIssue("file.invalid_json", section, [], { file, line, column }));
    }
  }
  return { files, issues };
}

/** Grava o banco no diretório, um arquivo por seção, em JSON canônico. */
export function writeBankDir(dir: string, bank: ModPackage): void {
  mkdirSync(dir, { recursive: true });
  for (const [file, content] of Object.entries(splitBankFiles(bank))) {
    writeFileSync(join(dir, file), content);
  }
}
