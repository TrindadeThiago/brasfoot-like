// Gera o banco padrão em disco. Uso: pnpm gen:default-bank [--seed <seed>] [--out <dir>]
import { join, relative } from "node:path";
import { parseArgs } from "node:util";
import { ageOn, generateDefaultBank, type ValidatedBank } from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";
import { REPO_ROOT, resolveUserPath, writeBankDir } from "./fs-bank";
import { summarize } from "./summary";

const { values } = parseArgs({
  options: {
    seed: { type: "string", default: DEFAULT_SEED },
    out: { type: "string" },
  },
});

const seed = values.seed ?? DEFAULT_SEED;
const outDir = values.out ? resolveUserPath(values.out) : join(REPO_ROOT, "mods", "default");

const bank: ValidatedBank = generateDefaultBank({ seed });
writeBankDir(outDir, bank);

const shown = relative(REPO_ROOT, outDir);
console.log(`Banco gerado com a seed "${seed}" em ${shown.startsWith("..") ? outDir : shown}`);
for (const line of summarize(bank, ageOn)) {
  console.log(`  ${line}`);
}
