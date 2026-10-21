import {
  BANK_FILES,
  type DataSection,
  joinBankFiles,
  type ModPackage,
  makeIssue,
  OPTIONAL_SECTIONS,
  splitBankFiles,
  type ValidatedBank,
  type ValidationIssue,
  validateBank,
} from "@brasfoot-like/engine";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { checkImages, dataUriBytes } from "./images";
import { MOD_LIMITS, type ModLimits } from "./limits";
import { type ModSummary, summarizeMod } from "./summary";

export type ModPackageResult =
  | {
      ok: true;
      bank: ValidatedBank;
      images: Record<string, string>;
      warnings: ValidationIssue[];
      summary: ModSummary;
      /** Arquivos de dados já lidos (para guardar o mod). */
      files: Record<string, unknown>;
    }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

/** Linha e coluna de um erro do `JSON.parse` (mensagens do V8 e do JavaScriptCore). */
function lineAndColumn(text: string, message: string): { line: number; column: number } {
  const explicit = /line (\d+) column (\d+)/.exec(message);
  if (explicit) return { line: Number(explicit[1]), column: Number(explicit[2]) };
  const position = /position (\d+)/.exec(message);
  if (!position) return { line: 1, column: 1 };
  const before = text.slice(0, Number(position[1])).split("\n");
  return { line: before.length, column: (before[before.length - 1]?.length ?? 0) + 1 };
}

/** Entradas do zip sem pastas, lixo de sistema e com a pasta de topo única removida. */
function entries(raw: Record<string, Uint8Array>): Record<string, Uint8Array> {
  const files = Object.entries(raw).filter(
    ([path]) =>
      !path.endsWith("/") &&
      !path.startsWith("__MACOSX/") &&
      !path.split("/").some((part) => part === ".DS_Store" || part === "Thumbs.db"),
  );
  const tops = new Set(files.map(([path]) => path.split("/")[0]));
  const nested = files.every(([path]) => path.includes("/"));
  const [top] = [...tops];
  const strip = nested && tops.size === 1 && top !== "images" ? `${top}/` : "";
  return Object.fromEntries(files.map(([path, bytes]) => [path.slice(strip.length), bytes]));
}

/**
 * Lê um pacote de mod `.zip` (015 research.md R3): limites, arquivos de dados, validação do banco e
 * imagens. Nunca lança para entrada inválida; devolve todos os erros e avisos.
 */
export function readModPackage(
  bytes: Uint8Array,
  limits: ModLimits = MOD_LIMITS,
): ModPackageResult {
  const issues: ValidationIssue[] = [];
  if (bytes.length > limits.package) {
    issues.push(
      makeIssue("package.too_large", "package", [], { size: bytes.length, max: limits.package }),
    );
    return { ok: false, errors: issues, warnings: [] };
  }
  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(bytes);
  } catch {
    return { ok: false, errors: [makeIssue("package.not_zip", "package", [], {})], warnings: [] };
  }
  const all = entries(raw);
  const files: Record<string, unknown> = {};
  for (const [section, file] of Object.entries(BANK_FILES) as [DataSection, string][]) {
    const content = all[file];
    if (!content) {
      if (!OPTIONAL_SECTIONS.includes(section)) {
        issues.push(makeIssue("file.missing", section, [], { file }));
      }
      continue;
    }
    if (content.length > limits.json) {
      issues.push(
        makeIssue("file.too_large", section, [], { file, size: content.length, max: limits.json }),
      );
      continue;
    }
    const text = strFromU8(content).replace(/^﻿/, "");
    try {
      files[file] = JSON.parse(text);
    } catch (error) {
      const { line, column } = lineAndColumn(text, (error as Error).message);
      issues.push(makeIssue("file.invalid_json", section, [], { file, line, column }));
    }
  }
  const imageFiles = Object.fromEntries(
    Object.entries(all).filter(([path]) => path.startsWith("images/")),
  );
  if (issues.length > 0) return { ok: false, errors: issues, warnings: [] };
  const validation = validateBank(joinBankFiles(files));
  const clubs = validation.ok
    ? validation.bank.clubs
    : ((files[BANK_FILES.clubs] as ModPackage["clubs"] | undefined) ?? []).filter(
        (club) => typeof club?.crest === "object",
      );
  const checked = checkImages({ clubs }, imageFiles, limits);
  const all_ = [
    ...(validation.ok ? validation.warnings : [...validation.errors, ...validation.warnings]),
    ...checked.issues,
  ];
  const errors = all_.filter((issue) => issue.severity === "error");
  const warnings = all_.filter((issue) => issue.severity === "warning");
  if (!validation.ok || errors.length > 0) return { ok: false, errors, warnings };
  return {
    ok: true,
    bank: validation.bank,
    images: checked.images,
    warnings,
    summary: summarizeMod(validation.bank, checked.images),
    files,
  };
}

/** Gera o `.zip` de um banco (arquivos de dados em JSON canônico + imagens). */
export function writeModPackage(bank: ModPackage, images: Record<string, string> = {}): Uint8Array {
  const zip: Record<string, Uint8Array> = {};
  for (const [file, content] of Object.entries(splitBankFiles(bank))) zip[file] = strToU8(content);
  for (const [path, uri] of Object.entries(images).sort(([a], [b]) => (a < b ? -1 : 1))) {
    zip[path] = dataUriBytes(uri);
  }
  // O zip grava a data no horário local (formato DOS): uma data montada pelos campos locais dá
  // o mesmo arquivo em qualquer fuso (o CI roda em UTC).
  return zipSync(zip, { level: 6, mtime: new Date(2026, 0, 1) });
}
