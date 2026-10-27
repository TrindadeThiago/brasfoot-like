// Gera o mod de exemplo dos estaduais (023) em mods/exemplo-estadual: um país fictício com a liga
// nacional de duas divisões e quatro estaduais de duas divisões (12 e 8 clubes), com clubes
// nacionais e regionais, grupos de 4, mata-mata de jogo único com mando do melhor campanha e final
// em ida e volta. O estadual acontece nas primeiras semanas, antes da liga.
// Uso: pnpm gen:regional-mod
import { join } from "node:path";
import { generateRegionalBank } from "@brasfoot-like/engine";
import { REPO_ROOT, writeBankDir } from "./fs-bank";

/** Seed fixa do mod de exemplo, versionado em mods/exemplo-estadual/. */
export const REGIONAL_EXAMPLE_SEED = "estadual-exemplo-1";

export function regionalExampleBank() {
  return generateRegionalBank({ seed: REGIONAL_EXAMPLE_SEED, states: 4 });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").at(-1) ?? "")) {
  const bank = regionalExampleBank();
  writeBankDir(join(REPO_ROOT, "mods", "exemplo-estadual"), bank);
  console.log("Mod de exemplo dos estaduais gerado em mods/exemplo-estadual");
  console.log(
    `  ${bank.countries.length} país, ${bank.clubs.length} clubes, ${bank.competitions.length} competições`,
  );
}
