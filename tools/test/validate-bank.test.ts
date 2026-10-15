import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { REPO_ROOT } from "../src/fs-bank.js";
import { runValidateBank } from "../src/validate-bank.js";

const FIXTURE = join(REPO_ROOT, "packages/engine/test/fixtures/invalid/multiple-defects");
const DEFAULT_MOD = join(REPO_ROOT, "mods/default");

const tempDirs: string[] = [];
function copyOfDefault(): string {
  const dir = mkdtempSync(join(tmpdir(), "brasfoot-mod-"));
  tempDirs.push(dir);
  cpSync(DEFAULT_MOD, dir, { recursive: true });
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("validate-bank", () => {
  it("aceita o banco padrão", () => {
    const { exitCode, lines } = runValidateBank(DEFAULT_MOD);
    expect(exitCode).toBe(0);
    expect(lines).toEqual(["Banco válido."]);
  });

  it("lista cada problema em pt-BR, com arquivo e caminho, e sai com código 1", () => {
    const { exitCode, lines } = runValidateBank(FIXTURE);
    expect(exitCode).toBe(1);
    expect(lines).toEqual([
      "clubs.json [4] — O clube clube-5 tem apenas 1 goleiro; o mínimo é 2.",
      "players.json [10].strength — O campo strength vale 150, mas deve estar entre 1 e 100.",
      "players.json [128].clubId — O jogador avulso referencia o clube clube-999, que não existe.",
      "(aviso) clubs.json [0].mascote — O campo mascote não é reconhecido e foi ignorado.",
      "3 erros e 1 aviso.",
    ]);
  });

  it("aponta arquivo ausente", () => {
    const dir = copyOfDefault();
    rmSync(join(dir, "clubs.json"));
    const { exitCode, lines } = runValidateBank(dir);
    expect(exitCode).toBe(1);
    expect(lines[0]).toBe("clubs.json — O arquivo clubs.json não foi encontrado.");
  });

  it("aponta JSON malformado com linha e coluna", () => {
    const dir = copyOfDefault();
    writeFileSync(join(dir, "countries.json"), '[\n  { "id": "val", }\n]\n');
    const { exitCode, lines } = runValidateBank(dir);
    expect(exitCode).toBe(1);
    expect(lines[0]).toMatch(
      /^countries\.json — O arquivo countries\.json não é um JSON válido \(linha 2, coluna \d+\)\.$/,
    );
  });
});
