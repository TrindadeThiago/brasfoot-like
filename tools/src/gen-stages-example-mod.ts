// Gera o mod de exemplo das fases (019) em mods/exemplo-fases: a liga nacional do banco padrão com
// a divisão de baixo em 4 grupos de 5 clubes, concentrados por região, seguidos de mata-mata.
// Uso: pnpm gen:stages-mod

import { join } from "node:path";
import { generateStagesBank } from "@brasfoot-like/engine";
import { REPO_ROOT, writeBankDir } from "./fs-bank";

/** Seed fixa do mod de exemplo das fases, versionado em mods/exemplo-fases/. */
export const STAGES_EXAMPLE_SEED = "fases-1";

export function stagesExampleBank() {
  return generateStagesBank({
    seed: STAGES_EXAMPLE_SEED,
    manifest: {
      id: "exemplo-fases",
      name: "Fases (exemplo)",
      author: "brasfoot-like",
      version: "1.0.0",
    },
  });
}

const bank = stagesExampleBank();
writeBankDir(join(REPO_ROOT, "mods", "exemplo-fases"), bank);
console.log("Mod de exemplo das fases gerado em mods/exemplo-fases");
console.log(
  `  ${bank.clubs.length} clubes, ${bank.players.length} jogadores; a divisão de baixo é em grupos + mata-mata`,
);
