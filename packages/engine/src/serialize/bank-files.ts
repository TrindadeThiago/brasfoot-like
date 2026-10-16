import type { ModPackage } from "../model/types";
import type { Section } from "../validation/issues";
import { toCanonicalJson } from "./canonical-json";

/** Arquivo de cada seção no diretório do mod (contracts/mod-format.md). */
export const BANK_FILES: Record<Section, string> = {
  manifest: "mod.json",
  countries: "countries.json",
  competitions: "competitions.json",
  clubs: "clubs.json",
  players: "players.json",
};

/** Converte o banco em `{ nomeDoArquivo: conteúdo }`, com JSON canônico. */
export function splitBankFiles(bank: ModPackage): Record<string, string> {
  const files: Record<string, string> = {};
  for (const [section, file] of Object.entries(BANK_FILES)) {
    files[file] = toCanonicalJson(bank[section as Section]);
  }
  return files;
}

/** Inverso de `splitBankFiles` a partir dos arquivos já lidos como JSON; não valida. */
export function joinBankFiles(files: Record<string, unknown>): unknown {
  const bank: Record<string, unknown> = {};
  for (const [section, file] of Object.entries(BANK_FILES)) {
    if (file in files) {
      bank[section] = files[file];
    }
  }
  return bank;
}
