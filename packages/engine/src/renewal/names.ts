import type { CompletedBank } from "../model/types";
import defaultBank from "../worldgen/name-banks/default.json" with { type: "json" };

export interface CountryNames {
  firstNames: string[];
  surnames: string[];
}

/** Banco de nomes padrão do motor (o do gerador do banco fictício). */
export const DEFAULT_NAME_BANK: CountryNames = {
  firstNames: [...defaultBank.firstNames],
  surnames: [...defaultBank.surnames],
};

/** Banco de nomes do país (do mod, se houver; senão o padrão) — research.md R10. */
export function nameBankFor(world: CompletedBank, countryId: string): CountryNames {
  return world.countries.find((country) => country.id === countryId)?.names ?? DEFAULT_NAME_BANK;
}
