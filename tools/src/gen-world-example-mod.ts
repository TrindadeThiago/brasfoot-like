// Gera o mod de exemplo de vários países (020) em mods/exemplo-mundo: 3 países fictícios de
// estruturas diferentes (uma divisão; duas divisões; duas divisões e copa nacional), cada um com a
// sua economia e o seu banco de nomes, e um limite de estrangeiros em um deles. Os países de duas
// divisões têm uma taça alimentada pela liga e o de copa tem também a supercopa (021).
// Uso: pnpm gen:world-mod
import { join } from "node:path";
import { generateWorldBank } from "@brasfoot-like/engine";
import { REPO_ROOT, writeBankDir } from "./fs-bank";

/** Seed fixa do mod de exemplo, versionado em mods/exemplo-mundo/. */
export const WORLD_EXAMPLE_SEED = "mundo-exemplo-1";

export function worldExampleBank() {
  const bank = generateWorldBank({
    seed: WORLD_EXAMPLE_SEED,
    countries: 3,
    divisionsPerCountry: 2,
    clubsPerDivision: 12,
    perCountry: [{ divisions: 1 }, { divisions: 2 }, { divisions: 2, cup: true }],
    // Vagas entre competições (021): taça alimentada e, no país com copa, a supercopa.
    qualification: true,
    manifest: {
      id: "exemplo-mundo",
      name: "Mundo (exemplo)",
      author: "brasfoot-like",
      version: "1.0.0",
    },
  });
  // O segundo país limita os estrangeiros por clube, como exemplo de `country.rules`.
  const countries = bank.countries.map((country, index) =>
    index === 1 ? { ...country, rules: { foreignLimit: 5 } } : country,
  );
  return { ...bank, countries };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").at(-1) ?? "")) {
  const bank = worldExampleBank();
  writeBankDir(join(REPO_ROOT, "mods", "exemplo-mundo"), bank);
  console.log("Mod de exemplo de vários países gerado em mods/exemplo-mundo");
  console.log(
    `  ${bank.countries.length} países, ${bank.clubs.length} clubes, ${bank.players.length} jogadores`,
  );
}
