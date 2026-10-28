import statesJson from "./brazil-states.json" with { type: "json" };
import countriesJson from "./countries.json" with { type: "json" };

/**
 * Lugares reais do mundo completo (024 R2): países, estados do Brasil e cidades. Nomes de lugares não
 * são conteúdo protegido (constituição, Princípio IV, 1.2.0). Clubes, competições e jogadores
 * continuam fictícios.
 */

export interface GeoCountry {
  id: string;
  name: string;
  /** Código de 3 letras do país. */
  code: string;
  /** Idioma do banco de nomes de pessoas (`names/<idioma>.json`). */
  language: string;
  cities: readonly string[];
}

export interface GeoState {
  id: string;
  /** Sigla de 2 letras (UF). */
  abbreviation: string;
  name: string;
  cities: readonly string[];
}

export const GEO_COUNTRIES: readonly GeoCountry[] = countriesJson;
export const BRAZIL_STATES: readonly GeoState[] = statesJson;

export function geoCountry(id: string): GeoCountry | undefined {
  return GEO_COUNTRIES.find((country) => country.id === id);
}
