// Gera o mundo padrão para download na página de Mods (024 R12): grava
// apps/web/public/mods/mundo-padrao.zip a partir da seed padrão. Roda antes do build do site; o arquivo
// não é versionado (ver .gitignore). Falha o build se o pacote não passar na validação.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./fs-bank";
import { DEFAULT_SEED, runGenFootballWorld } from "./gen-football-world";

const dir = join(REPO_ROOT, "apps", "web", "public", "mods");
mkdirSync(dir, { recursive: true });
const result = runGenFootballWorld({ profile: "padrao", seed: DEFAULT_SEED });
for (const line of result.lines) console.log(line);
if (result.exitCode !== 0 || !result.zip) process.exit(result.exitCode || 1);
writeFileSync(join(dir, "mundo-padrao.zip"), result.zip);
console.log(`  gravado em ${join(dir, "mundo-padrao.zip")}`);
