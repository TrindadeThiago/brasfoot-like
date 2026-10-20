import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BANK_FILES, ISSUE_CODES } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { CLUB_COLUMNS, PLAYER_COLUMNS } from "../src";
import { modBank } from "./fixtures";

const ROOT = join(import.meta.dirname, "../../..");
const doc = readFileSync(join(ROOT, "docs/mod-format.md"), "utf8");

describe("documentação do formato (015 US3, critério de aceite 3, SC-004)", () => {
  it("lista todos os códigos de erro", () => {
    expect(ISSUE_CODES.filter((code) => !doc.includes(`\`${code}\``))).toEqual([]);
  });

  it("descreve todos os arquivos, os campos de clube/jogador/competição e as colunas CSV", () => {
    const bank = modBank();
    const fields = new Set<string>();
    for (const entity of [...bank.clubs, ...bank.players, ...bank.competitions]) {
      for (const key of Object.keys(entity)) fields.add(key);
    }
    const names = [...Object.values(BANK_FILES), ...fields, ...CLUB_COLUMNS, ...PLAYER_COLUMNS];
    expect(names.filter((name) => !doc.includes(`\`${name}\``))).toEqual([]);
  });

  it("a cópia servida pela web é igual ao documento", () => {
    expect(readFileSync(join(ROOT, "apps/web/public/docs/mod-format.md"), "utf8")).toBe(doc);
  });
});
