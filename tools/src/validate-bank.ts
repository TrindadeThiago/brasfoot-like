// Valida um diretório de mod. Uso: pnpm validate-bank <diretório>
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BANK_FILES,
  joinBankFiles,
  type ValidationIssue,
  validateBank,
} from "@brasfoot-like/engine";
import { formatIssue, formatMessage, type Locale } from "@brasfoot-like/i18n";
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
  const location = [BANK_FILES[issue.section], pathText(issue.path)].filter(Boolean).join(" ");
  const line = `${location} — ${formatIssue(issue, LOCALE)}`;
  return issue.severity === "warning"
    ? `${formatMessage("cli.warningPrefix", {}, LOCALE)} ${line}`
    : line;
}

/** Lê, valida e descreve o banco; não encerra o processo (testável). */
export function runValidateBank(dir: string): ValidateBankOutput {
  const { files, issues: fileIssues } = readBankDir(dir);
  if (fileIssues.length > 0) {
    return {
      exitCode: 1,
      lines: [
        ...fileIssues.map(issueLine),
        formatMessage("cli.summary", { errors: fileIssues.length, warnings: 0 }, LOCALE),
      ],
    };
  }
  const result = validateBank(joinBankFiles(files));
  const errors = result.ok ? [] : result.errors;
  if (errors.length === 0 && result.warnings.length === 0) {
    return { exitCode: 0, lines: [formatMessage("cli.valid", {}, LOCALE)] };
  }
  return {
    exitCode: errors.length > 0 ? 1 : 0,
    lines: [
      ...errors.map(issueLine),
      ...result.warnings.map(issueLine),
      formatMessage(
        "cli.summary",
        { errors: errors.length, warnings: result.warnings.length },
        LOCALE,
      ),
    ],
  };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const dir = process.argv[2];
  if (dir === undefined) {
    console.error("Uso: pnpm validate-bank <diretório do mod>");
    process.exit(2);
  }
  const { exitCode, lines } = runValidateBank(resolveUserPath(dir));
  for (const line of lines) console.log(line);
  process.exit(exitCode);
}
