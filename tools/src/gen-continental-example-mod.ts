// Gera o mod de exemplo das competições entre países (022) em mods/exemplo-continental: 4 países
// fictícios de uma divisão e copa nacional, a taça continental maior (16 clubes, 4 grupos separados
// por país e mata-mata) e a menor, ligada a ela (os terceiros dos grupos descem para a 2ª fase).
// Uso: pnpm gen:continental-mod
import { join } from "node:path";
import { generateWorldBank } from "@brasfoot-like/engine";
import { REPO_ROOT, writeBankDir } from "./fs-bank";

/** Seed fixa do mod de exemplo, versionado em mods/exemplo-continental/. */
export const CONTINENTAL_EXAMPLE_SEED = "continental-exemplo-1";

export function continentalExampleBank() {
  return generateWorldBank({
    seed: CONTINENTAL_EXAMPLE_SEED,
    countries: 4,
    divisionsPerCountry: 1,
    clubsPerDivision: 12,
    cup: true,
    continental: "compact",
    manifest: {
      id: "exemplo-continental",
      name: "Continente (exemplo)",
      author: "brasfoot-like",
      version: "1.0.0",
    },
  });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").at(-1) ?? "")) {
  const bank = continentalExampleBank();
  writeBankDir(join(REPO_ROOT, "mods", "exemplo-continental"), bank);
  console.log("Mod de exemplo das competições entre países gerado em mods/exemplo-continental");
  console.log(
    `  ${bank.countries.length} países, ${bank.clubs.length} clubes, ${bank.competitions.length} competições`,
  );
}
