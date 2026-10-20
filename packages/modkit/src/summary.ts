import type { ModPackage } from "@brasfoot-like/engine";

/** Resumo de um mod para a lista e o relatório (015 data-model.md). */
export interface ModSummary {
  id: string;
  name: string;
  author: string;
  version: string;
  countries: string[];
  competition: string;
  divisions: { level: number; name: string; clubs: number }[];
  clubs: number;
  players: number;
  images: number;
}

export function summarizeMod(bank: ModPackage, images: Record<string, string>): ModSummary {
  const competition = bank.competitions[0];
  return {
    id: bank.manifest.id,
    name: bank.manifest.name,
    author: bank.manifest.author,
    version: bank.manifest.version,
    countries: bank.countries.map((country) => country.name),
    competition: competition?.name ?? "",
    divisions: (competition?.divisions ?? []).map((division) => ({
      level: division.level,
      name: division.name,
      clubs: division.clubIds.length,
    })),
    clubs: bank.clubs.length,
    players: bank.players.length,
    images: Object.keys(images).length,
  };
}
