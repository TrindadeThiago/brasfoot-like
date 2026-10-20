// Gera o mod de exemplo (outro país fictício) em disco e o pacote para download na web (015).
// Uso: pnpm gen:example-mod
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ageOn, generateDefaultBank } from "@brasfoot-like/engine";
import { writeModPackage } from "@brasfoot-like/modkit";
import names from "../../packages/engine/src/worldgen/name-banks/exemplo.json" with {
  type: "json",
};
import { REPO_ROOT, writeBankDir } from "./fs-bank";
import { summarize } from "./summary";

/** Seed fixa do mod de exemplo versionado em mods/exemplo/. */
export const EXAMPLE_SEED = "norvalia-1";

export function exampleBank() {
  return generateDefaultBank({
    seed: EXAMPLE_SEED,
    names,
    divisionSize: 12,
    slots: 2,
    divisionNames: ["Primeira Divisão", "Segunda Divisão"],
    manifest: {
      id: "exemplo-norvalia",
      name: "Norvália (exemplo)",
      author: "brasfoot-like",
      version: "1.0.0",
    },
  });
}

const bank = exampleBank();
const modDir = join(REPO_ROOT, "mods", "exemplo");
writeBankDir(modDir, bank);
const zipPath = join(REPO_ROOT, "apps", "web", "public", "mods", "exemplo.zip");
mkdirSync(dirname(zipPath), { recursive: true });
writeFileSync(zipPath, writeModPackage(bank));
const docsPath = join(REPO_ROOT, "apps", "web", "public", "docs", "mod-format.md");
mkdirSync(dirname(docsPath), { recursive: true });
copyFileSync(join(REPO_ROOT, "docs", "mod-format.md"), docsPath);

console.log("Mod de exemplo gerado em mods/exemplo e apps/web/public/mods/exemplo.zip");
for (const line of summarize(bank, ageOn)) console.log(`  ${line}`);
