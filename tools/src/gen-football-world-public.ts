// Gera os mods mundo reduzido, médio e completo para download na página de Mods (024 R12): grava
// apps/web/public/mods/mundo-<tamanho>.zip a partir da seed padrão. Roda antes do build do site; os
// arquivos não são versionados (ver .gitignore). Falha o build se algum pacote não passar na validação.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORLD_SIZES } from "@brasfoot-like/engine";
import { REPO_ROOT } from "./fs-bank";
import { DEFAULT_SEED, runGenFootballWorld } from "./gen-football-world";

const dir = join(REPO_ROOT, "apps", "web", "public", "mods");
mkdirSync(dir, { recursive: true });
for (const size of WORLD_SIZES) {
  const result = runGenFootballWorld({ profile: size, seed: DEFAULT_SEED });
  for (const line of result.lines) console.log(line);
  if (result.exitCode !== 0 || !result.zip) process.exit(result.exitCode || 1);
  writeFileSync(join(dir, `mundo-${size}.zip`), result.zip);
  console.log(`  gravado em ${join(dir, `mundo-${size}.zip`)}`);
}
