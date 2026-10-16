import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BANK_FILES, splitBankFiles } from "../../src/serialize/bank-files";
import { generateDefaultBank } from "../../src/worldgen/generate";

const DEFAULT_SEED = "brasfoot-like-default-1";
const MOD_DIR = join(import.meta.dirname, "..", "..", "..", "..", "mods", "default");

/**
 * O banco padrão versionado em mods/default/ deve ser exatamente o que o gerador produz com a
 * seed padrão. Se este teste falhar após uma mudança intencional no gerador, regenere com
 * `pnpm gen:default-bank` e revise o diff.
 */
describe("mods/default (golden)", () => {
  const generated = splitBankFiles(generateDefaultBank({ seed: DEFAULT_SEED }));

  it.each(Object.values(BANK_FILES))("%s é idêntico ao gerado", (file) => {
    expect(readFileSync(join(MOD_DIR, file), "utf8")).toBe(generated[file]);
  });
});
