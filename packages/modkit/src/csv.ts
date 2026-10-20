import {
  type Club,
  type ModPackage,
  makeIssue,
  type Player,
  type ValidatedBank,
  type ValidationIssue,
  validateBank,
} from "@brasfoot-like/engine";

/** Colunas de `clubs.csv` (docs/mod-format.md §10). */
export const CLUB_COLUMNS = [
  "id",
  "name",
  "shortName",
  "abbreviation",
  "city",
  "countryId",
  "reputation",
  "stadiumCapacity",
  "initialCash",
  "colorPrimary",
  "colorSecondary",
  "crestShape",
  "crestColor1",
  "crestColor2",
  "crestColor3",
  "crestInitials",
  "crestImage",
] as const;

/** Colunas de `players.csv` (docs/mod-format.md §10). */
export const PLAYER_COLUMNS = [
  "id",
  "name",
  "displayName",
  "birthDate",
  "nationalityId",
  "clubId",
  "position",
  "strength",
  "traits",
  "potential",
  "temperament",
  "injuryProneness",
  "contractWage",
  "contractUntilYear",
  "loanFromClubId",
  "loanUntilYear",
] as const;

const CLUB_REQUIRED = CLUB_COLUMNS.filter(
  (column) => column !== "crestColor3" && column !== "crestImage",
);
const PLAYER_REQUIRED = PLAYER_COLUMNS.slice(0, 9);
const CLUB_NUMBERS = new Set(["reputation", "stadiumCapacity", "initialCash"]);
const PLAYER_NUMBERS = new Set([
  "strength",
  "potential",
  "temperament",
  "injuryProneness",
  "contractWage",
  "contractUntilYear",
  "loanUntilYear",
]);

type Row = Record<string, string>;

/** Uma linha de dados com o número da linha no arquivo (1 = cabeçalho). */
export interface CsvRow {
  line: number;
  values: Row;
}

function quoteCell(value: string): string {
  return /[",;\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function toCsv(columns: readonly string[], rows: Row[]): string {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => quoteCell(row[column] ?? "")).join(",")),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Clubes do banco em CSV (UTF-8 com BOM, separador vírgula). */
export function clubsToCsv(bank: Pick<ModPackage, "clubs">): string {
  return toCsv(
    CLUB_COLUMNS,
    bank.clubs.map((club) => ({
      id: club.id,
      name: club.name,
      shortName: club.shortName,
      abbreviation: club.abbreviation,
      city: club.city,
      countryId: club.countryId,
      reputation: String(club.reputation),
      stadiumCapacity: String(club.stadiumCapacity),
      initialCash: String(club.initialCash),
      colorPrimary: club.colors.primary,
      colorSecondary: club.colors.secondary,
      crestShape: club.crest.shape,
      crestColor1: club.crest.colors[0] ?? "",
      crestColor2: club.crest.colors[1] ?? "",
      crestColor3: club.crest.colors[2] ?? "",
      crestInitials: club.crest.initials,
      crestImage: club.crest.image ?? "",
    })),
  );
}

/** Jogadores do banco em CSV (UTF-8 com BOM, separador vírgula). */
export function playersToCsv(bank: Pick<ModPackage, "players">): string {
  const optional = (value: number | undefined) => (value === undefined ? "" : String(value));
  return toCsv(
    PLAYER_COLUMNS,
    bank.players.map((player) => ({
      id: player.id,
      name: player.name,
      displayName: player.displayName,
      birthDate: player.birthDate,
      nationalityId: player.nationalityId,
      clubId: player.clubId,
      position: player.position,
      strength: String(player.strength),
      traits: player.traits.join("|"),
      potential: optional(player.hidden?.potential),
      temperament: optional(player.hidden?.temperament),
      injuryProneness: optional(player.hidden?.injuryProneness),
      contractWage: optional(player.contract?.wage),
      contractUntilYear: optional(player.contract?.untilYear),
      loanFromClubId: player.contract?.loan?.fromClubId ?? "",
      loanUntilYear: optional(player.contract?.loan?.untilYear),
    })),
  );
}

/** Separa o texto em registros e campos (aspas com `""`, CRLF/LF), acompanhando as linhas. */
function records(
  text: string,
  separator: string,
  file: string,
  issues: ValidationIssue[],
): { line: number; fields: string[] }[] {
  const out: { line: number; fields: string[] }[] = [];
  let fields: string[] = [];
  let field = "";
  let quoted = false;
  let line = 1;
  let start = 1;
  for (let index = 0; index < text.length; index++) {
    const char = text[index] as string;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        if (char === "\n") line++;
        field += char;
      }
      continue;
    }
    if (char === '"' && field === "") quoted = true;
    else if (char === separator) {
      fields.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      fields.push(field);
      out.push({ line: start, fields });
      fields = [];
      field = "";
      line++;
      start = line;
    } else field += char;
  }
  if (quoted) {
    issues.push(makeIssue("csv.unclosed_quote", "package", [file, start], { file, line: start }));
  }
  if (field !== "" || fields.length > 0) {
    fields.push(field);
    out.push({ line: start, fields });
  }
  return out.filter((record) => !(record.fields.length === 1 && record.fields[0] === ""));
}

/**
 * Lê um CSV (research.md R8): UTF-8 com ou sem BOM, separador `,` ou `;` (detectado no cabeçalho).
 * Devolve as linhas como `coluna → valor` e os problemas de formato com linha e coluna.
 */
export function parseCsv(
  input: string,
  file: string,
  columns: readonly string[],
  required: readonly string[],
): { rows: CsvRow[]; issues: ValidationIssue[] } {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const separator =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const issues: ValidationIssue[] = [];
  const [header, ...data] = records(text, separator, file, issues);
  const names = (header?.fields ?? []).map((name) => name.trim());
  for (const column of required) {
    if (!names.includes(column)) {
      issues.push(makeIssue("csv.missing_column", "package", [file], { file, column }));
    }
  }
  for (const name of names) {
    if (!columns.includes(name)) {
      issues.push(makeIssue("csv.unknown_column", "package", [file], { file, column: name }));
    }
  }
  const rows: CsvRow[] = [];
  for (const record of data) {
    if (record.fields.length !== names.length) {
      issues.push(
        makeIssue("csv.row_length", "package", [file, record.line], {
          file,
          line: record.line,
          found: record.fields.length,
          expected: names.length,
        }),
      );
      continue;
    }
    const values: Row = {};
    names.forEach((name, index) => {
      values[name] = (record.fields[index] ?? "").trim();
    });
    rows.push({ line: record.line, values });
  }
  return { rows, issues };
}

function numberOf(
  row: CsvRow,
  column: string,
  file: string,
  issues: ValidationIssue[],
): number | undefined {
  const raw = row.values[column] ?? "";
  if (raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    issues.push(
      makeIssue("csv.invalid_number", "package", [file, row.line, column], {
        file,
        line: row.line,
        column,
        value: raw,
      }),
    );
    return undefined;
  }
  return value;
}

function checkNumbers(
  rows: CsvRow[],
  numbers: Set<string>,
  file: string,
  issues: ValidationIssue[],
) {
  for (const row of rows) for (const column of numbers) numberOf(row, column, file, issues);
}

function clubFrom(row: CsvRow): Club {
  const v = row.values;
  const colors = [v.crestColor1, v.crestColor2, v.crestColor3].filter(
    (value): value is string => value !== undefined && value !== "",
  );
  return {
    id: v.id ?? "",
    name: v.name ?? "",
    shortName: v.shortName ?? "",
    abbreviation: v.abbreviation ?? "",
    city: v.city ?? "",
    countryId: v.countryId ?? "",
    colors: { primary: v.colorPrimary ?? "", secondary: v.colorSecondary ?? "" },
    crest: {
      shape: (v.crestShape ?? "") as Club["crest"]["shape"],
      colors,
      initials: v.crestInitials ?? "",
      ...(v.crestImage ? { image: v.crestImage } : {}),
    },
    reputation: Number(v.reputation),
    stadiumCapacity: Number(v.stadiumCapacity),
    initialCash: Number(v.initialCash),
  };
}

function playerFrom(row: CsvRow): Player {
  const v = row.values;
  const num = (column: string) => (v[column] ? Number(v[column]) : undefined);
  const hidden = {
    ...(num("potential") !== undefined ? { potential: num("potential") as number } : {}),
    ...(num("temperament") !== undefined ? { temperament: num("temperament") as number } : {}),
    ...(num("injuryProneness") !== undefined
      ? { injuryProneness: num("injuryProneness") as number }
      : {}),
  };
  const wage = num("contractWage");
  const until = num("contractUntilYear");
  const loanUntil = num("loanUntilYear");
  return {
    id: v.id ?? "",
    name: v.name ?? "",
    displayName: v.displayName ?? "",
    birthDate: v.birthDate ?? "",
    nationalityId: v.nationalityId ?? "",
    clubId: v.clubId ?? "",
    position: (v.position ?? "") as Player["position"],
    strength: Number(v.strength),
    traits: (v.traits ? v.traits.split("|").map((trait) => trait.trim()) : []) as Player["traits"],
    ...(Object.keys(hidden).length > 0 ? { hidden } : {}),
    ...(wage !== undefined && until !== undefined
      ? {
          contract: {
            wage,
            untilYear: until,
            ...(v.loanFromClubId && loanUntil !== undefined
              ? { loan: { fromClubId: v.loanFromClubId, untilYear: loanUntil } }
              : {}),
          },
        }
      : {}),
  };
}

/** Problemas da validação do banco apontando a linha do CSV de origem, quando houver. */
function withCsvLines(
  issues: ValidationIssue[],
  lines: { clubs?: number[]; players?: number[] },
): ValidationIssue[] {
  return issues.map((issue) => {
    const index = typeof issue.path[0] === "number" ? issue.path[0] : undefined;
    const file =
      issue.section === "clubs"
        ? "clubs.csv"
        : issue.section === "players"
          ? "players.csv"
          : undefined;
    const list =
      issue.section === "clubs"
        ? lines.clubs
        : issue.section === "players"
          ? lines.players
          : undefined;
    const line = index !== undefined ? list?.[index] : undefined;
    return file && line !== undefined
      ? { ...issue, params: { ...issue.params, csvFile: file, csvLine: line } }
      : issue;
  });
}

export type CsvResult =
  | { ok: true; bank: ValidatedBank; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

/**
 * Aplica CSVs de clubes e/ou jogadores sobre um banco (research.md R8): os CSVs substituem a lista
 * inteira da seção correspondente; o resultado passa pela validação do jogo.
 */
export function applyCsv(bank: ModPackage, csv: { clubs?: string; players?: string }): CsvResult {
  const issues: ValidationIssue[] = [];
  const next: ModPackage = JSON.parse(JSON.stringify(bank)) as ModPackage;
  const lines: { clubs?: number[]; players?: number[] } = {};
  if (csv.clubs !== undefined) {
    const parsed = parseCsv(csv.clubs, "clubs.csv", CLUB_COLUMNS, CLUB_REQUIRED);
    issues.push(...parsed.issues);
    checkNumbers(parsed.rows, CLUB_NUMBERS, "clubs.csv", issues);
    next.clubs = parsed.rows.map(clubFrom);
    lines.clubs = parsed.rows.map((row) => row.line);
  }
  if (csv.players !== undefined) {
    const parsed = parseCsv(csv.players, "players.csv", PLAYER_COLUMNS, PLAYER_REQUIRED);
    issues.push(...parsed.issues);
    checkNumbers(parsed.rows, PLAYER_NUMBERS, "players.csv", issues);
    next.players = parsed.rows.map(playerFrom);
    lines.players = parsed.rows.map((row) => row.line);
  }
  const formatErrors = issues.filter((issue) => issue.severity === "error");
  const formatWarnings = issues.filter((issue) => issue.severity === "warning");
  if (formatErrors.length > 0) return { ok: false, errors: formatErrors, warnings: formatWarnings };
  const validation = validateBank(next);
  if (!validation.ok) {
    return {
      ok: false,
      errors: withCsvLines(validation.errors, lines),
      warnings: [...formatWarnings, ...withCsvLines(validation.warnings, lines)],
    };
  }
  return { ok: true, bank: validation.bank, warnings: [...formatWarnings, ...validation.warnings] };
}
