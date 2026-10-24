import { validateBank } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { applyCsv, CLUB_COLUMNS, clubsToCsv, parseCsv, playersToCsv } from "../src";
import { modBank } from "./fixtures";

const bank = modBank();

function codes(result: ReturnType<typeof applyCsv>) {
  return result.ok ? [] : result.errors.map((issue) => issue.code);
}

describe("CSV de clubes e jogadores (015 US4)", () => {
  it("exportar e importar sem edições dá o mesmo banco (SC-006)", () => {
    const result = applyCsv(bank, { clubs: clubsToCsv(bank), players: playersToCsv(bank) });
    if (!result.ok) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
    const original = validateBank(bank);
    if (!original.ok) throw new Error("banco padrão inválido");
    expect(result.bank).toEqual(original.bank);
  });

  it("a região do clube (019) vai e volta pelo CSV, e a coluna é opcional", () => {
    const withRegion = {
      ...bank,
      clubs: bank.clubs.map((club, index) => (index === 0 ? { ...club, region: "Norte" } : club)),
    };
    const csv = clubsToCsv(withRegion);
    expect(csv.split(/\r?\n/, 1)[0]).toContain("region");
    const result = applyCsv(bank, { clubs: csv });
    if (!result.ok) throw new Error(JSON.stringify(result.errors.slice(0, 3)));
    expect(result.bank.clubs[0]?.region).toBe("Norte");
    expect(result.bank.clubs[1]?.region).toBeUndefined();
    // um CSV antigo, sem a coluna, continua sendo aceito
    const header = (csv.split(/\r?\n/)[0] ?? "").replace(/^\uFEFF/, "").split(",");
    const without = csv
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((line) => line !== "")
      .map((line) => line.split(",").slice(0, header.indexOf("region")).join(","))
      .join("\n");
    const old = applyCsv(bank, { clubs: without });
    if (!old.ok) throw new Error(JSON.stringify(old.errors.slice(0, 3)));
    expect(old.bank.clubs[0]?.region).toBeUndefined();
  });

  it("exporta com BOM e vírgula; aceita ponto e vírgula, aspas, sem BOM e CRLF", () => {
    const csv = clubsToCsv(bank);
    expect(csv.startsWith("﻿id,name,")).toBe(true);
    const text = `id;name\r\n"a;1";"Clube ""Bom"""\r\nb;Outro\r\n`;
    const parsed = parseCsv(text, "clubs.csv", ["id", "name"], ["id", "name"]);
    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([
      { line: 2, values: { id: "a;1", name: 'Clube "Bom"' } },
      { line: 3, values: { id: "b", name: "Outro" } },
    ]);
  });

  it("aponta erros de formato com arquivo, linha e coluna", () => {
    const header = CLUB_COLUMNS.join(",");
    const [, first = ""] = clubsToCsv(bank).replace(/^﻿/, "").split("\r\n");
    const missing = applyCsv(bank, { clubs: "id,name\nx,y\n" });
    expect(codes(missing)).toContain("csv.missing_column");

    const short = applyCsv(bank, { clubs: `${header}\n${first}\na,b\n` });
    expect(short.ok).toBe(false);
    if (!short.ok) {
      expect(short.errors[0]).toMatchObject({
        code: "csv.row_length",
        params: { file: "clubs.csv", line: 3, expected: CLUB_COLUMNS.length, found: 2 },
      });
    }

    const cells = first.split(",");
    cells[CLUB_COLUMNS.indexOf("reputation")] = "muito";
    const number = applyCsv(bank, { clubs: `${header}\n${cells.join(",")}\n` });
    if (number.ok) throw new Error("deveria falhar");
    expect(number.errors[0]).toMatchObject({
      code: "csv.invalid_number",
      params: { line: 2, column: "reputation", value: "muito" },
    });

    const quote = parseCsv('id,name\n"a,b\n', "clubs.csv", ["id", "name"], ["id"]);
    expect(quote.issues.map((issue) => issue.code)).toContain("csv.unclosed_quote");
  });

  it("coluna desconhecida é aviso", () => {
    const parsed = parseCsv("id,name,extra\na,b,c\n", "clubs.csv", ["id", "name"], ["id"]);
    expect(parsed.issues.map((issue) => [issue.code, issue.severity])).toContainEqual([
      "csv.unknown_column",
      "warning",
    ]);
  });

  it("erro da validação aponta a linha do CSV", () => {
    const csv = playersToCsv(bank).replace(/^﻿/, "").split("\r\n");
    const header = (csv[0] ?? "").split(",");
    const row = (csv[5] ?? "").split(",");
    row[header.indexOf("clubId")] = "clube-inexistente";
    csv[5] = row.join(",");
    const result = applyCsv(bank, { players: csv.join("\r\n") });
    if (result.ok) throw new Error("deveria falhar");
    const issue = result.errors.find((entry) => entry.params.csvLine !== undefined);
    expect(issue?.params).toMatchObject({ csvFile: "players.csv", csvLine: 6 });
  });
});
