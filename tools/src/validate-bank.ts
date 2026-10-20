// Valida um mod (pasta ou pacote .zip). Uso: pnpm validate-bank <pasta|arquivo.zip>
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BANK_FILES,
  joinBankFiles,
  type ValidationIssue,
  validateBank,
} from "@brasfoot-like/engine";
import { formatIssue, formatMessage, type Locale } from "@brasfoot-like/i18n";
import { readModPackage } from "@brasfoot-like/modkit";
import { readBankDir, resolveUserPath } from "./fs-bank";

const LOCALE: Locale = "pt-BR";

export interface ValidateBankOutput {
  exitCode: number;
  lines: string[];
}

/** `[132, "clubId"]` → `"[132].clubId"`. */
function pathText(path: (string | number)[]): string {
  return path
    .map((segment, index) => {
      if (typeof segment === "number") return `[${segment}]`;
      return index === 0 ? segment : `.${segment}`;
    })
    .join("");
}

function issueLine(issue: ValidationIssue): string {
  const location = [
    (BANK_FILES as Partial<Record<string, string>>)[issue.section],
    pathText(issue.path),
  ]
    .filter(Boolean)
    .join(" ");
  const line = `${location} — ${formatIssue(issue, LOCALE)}`;
  return issue.severity === "warning"
    ? `${formatMessage("cli.warningPrefix", {}, LOCALE)} ${line}`
    : line;
}

function report(errors: ValidationIssue[], warnings: ValidationIssue[]): ValidateBankOutput {
  if (errors.length === 0 && warnings.length === 0) {
    return { exitCode: 0, lines: [formatMessage("cli.valid", {}, LOCALE)] };
  }
  return {
    exitCode: errors.length > 0 ? 1 : 0,
    lines: [
      ...errors.map(issueLine),
      ...warnings.map(issueLine),
      formatMessage("cli.summary", { errors: errors.length, warnings: warnings.length }, LOCALE),
    ],
  };
}

/** Lê, valida e descreve o banco (pasta ou pacote `.zip`, 015); não encerra o processo (testável). */
export function runValidateBank(path: string): ValidateBankOutput {
  if (path.toLowerCase().endsWith(".zip")) {
    const result = readModPackage(new Uint8Array(readFileSync(path)));
    return report(result.ok ? [] : result.errors, result.warnings);
  }
  const { files, issues: fileIssues } = readBankDir(path);
  if (fileIssues.length > 0) return report(fileIssues, []);
  const result = validateBank(joinBankFiles(files));
  return report(result.ok ? [] : result.errors, result.warnings);
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const dir = process.argv[2];
  if (dir === undefined) {
    console.error("Uso: pnpm validate-bank <pasta do mod|pacote .zip>");
    process.exit(2);
  }
  const { exitCode, lines } = runValidateBank(resolveUserPath(dir));
  for (const line of lines) console.log(line);
  process.exit(exitCode);
}
