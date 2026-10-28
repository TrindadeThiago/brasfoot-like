import { geoCountry } from "./geo";
import { nameBankOf } from "./names";

/**
 * Perfil do mundo completo (024 R1): confederações, países e o detalhe do Brasil. É só dado: o
 * gerador lê o perfil e monta o banco; nada aqui é regra de jogo.
 */

/** Pirâmide e tamanho por nível do país (R1). */
export const TIERS = {
  1: { divisions: 2, clubsPerDivision: 20 },
  2: { divisions: 2, clubsPerDivision: 16 },
  3: { divisions: 1, clubsPerDivision: 14 },
  4: { divisions: 1, clubsPerDivision: 10 },
} as const;

export type Tier = keyof typeof TIERS;

export interface CountrySpec {
  /** Id em `geo/countries.json`. */
  geoId: string;
  tier: Tier;
  /** Peso relativo (0,5 a 1,5): reputação, economia e vagas continentais. */
  strength: number;
  /** Idioma dos nomes de pessoas; padrão: o do país em `geo`. */
  language?: string;
  /** Ajustes da pirâmide. */
  divisions?: 1 | 2;
  clubsPerDivision?: number;
  cup?: boolean;
}

export interface Confederation {
  id: string;
  name: string;
  /** Se há competição continental secundária, ligada à principal. */
  minor: boolean;
  countries: CountrySpec[];
}

export interface BrazilSpec {
  /** Clubes de cada uma das divisões A a D (padrão 20; múltiplo de 4). */
  clubsPerDivision: number;
  /** Quantos dos 27 estados têm estadual (padrão 27, em ordem alfabética da sigla). */
  states: number;
  /** Clubes da 1ª e da 2ª divisão de cada estadual (múltiplos de 4). */
  estadual: { firstDivision: number; secondDivision: number };
}

export interface WorldProfile {
  id: string;
  manifest: { id: string; name: string; author: string; version: string };
  confederations: Confederation[];
  /** O país `brasil` com divisões A a D e estaduais; sem isto ele segue o nível dele. */
  brazil?: BrazilSpec;
}

export type ProfileIssueCode =
  | "profile.empty"
  | "profile.duplicate_confederation"
  | "profile.unknown_country"
  | "profile.duplicate_country"
  | "profile.few_countries"
  | "profile.tier_range"
  | "profile.strength_range"
  | "profile.cities_short"
  | "profile.unknown_language"
  | "profile.brazil_range";

export interface ProfileIssue {
  code: ProfileIssueCode;
  path: string;
  params: Record<string, string | number>;
}

/** Cidades necessárias: no máximo 2 clubes por cidade. */
export function clubsOfCountry(spec: CountrySpec): number {
  const tier = TIERS[spec.tier];
  const divisions = spec.divisions ?? tier.divisions;
  return divisions * (spec.clubsPerDivision ?? tier.clubsPerDivision);
}

/**
 * Valida o perfil contra os dados de geografia e de nomes. Cada confederação precisa de ao menos 4
 * países: a competição continental separa os clubes do mesmo país nos grupos de 4.
 */
export function validateProfile(profile: WorldProfile): ProfileIssue[] {
  const issues: ProfileIssue[] = [];
  const issue = (code: ProfileIssueCode, path: string, params: ProfileIssue["params"] = {}) =>
    issues.push({ code, path, params });
  if (profile.confederations.length === 0) issue("profile.empty", "confederations");
  const confederations = new Set<string>();
  const countries = new Set<string>();
  profile.confederations.forEach((confederation, c) => {
    const base = `confederations[${c}]`;
    if (confederations.has(confederation.id)) {
      issue("profile.duplicate_confederation", base, { id: confederation.id });
    }
    confederations.add(confederation.id);
    if (confederation.countries.length < 4) {
      issue("profile.few_countries", `${base}.countries`, {
        confederation: confederation.id,
        count: confederation.countries.length,
        min: 4,
      });
    }
    confederation.countries.forEach((spec, k) => {
      const path = `${base}.countries[${k}]`;
      const geo = geoCountry(spec.geoId);
      if (!geo) {
        issue("profile.unknown_country", path, { geoId: spec.geoId });
        return;
      }
      if (countries.has(spec.geoId))
        issue("profile.duplicate_country", path, { geoId: spec.geoId });
      countries.add(spec.geoId);
      if (!(spec.tier in TIERS)) issue("profile.tier_range", path, { tier: spec.tier });
      if (!(spec.strength >= 0.5 && spec.strength <= 1.5)) {
        issue("profile.strength_range", path, { strength: spec.strength });
      }
      const language = spec.language ?? geo.language;
      if (!nameBankOf(language)) issue("profile.unknown_language", path, { language });
      if (spec.tier in TIERS) {
        const clubs = clubsOfCountry(spec);
        const needed = Math.ceil(clubs / 2);
        if (geo.cities.length < needed) {
          issue("profile.cities_short", path, {
            geoId: spec.geoId,
            cities: geo.cities.length,
            needed,
          });
        }
      }
    });
  });
  const brazil = profile.brazil;
  if (brazil) {
    const ok =
      brazil.clubsPerDivision >= 12 &&
      brazil.clubsPerDivision % 4 === 0 &&
      brazil.states >= 1 &&
      brazil.states <= 27 &&
      brazil.estadual.firstDivision % 4 === 0 &&
      brazil.estadual.secondDivision % 4 === 0 &&
      brazil.estadual.firstDivision >= 8 &&
      brazil.estadual.secondDivision >= 8 &&
      // Os clubes nacionais cabem na 1ª divisão dos estaduais.
      brazil.states * brazil.estadual.firstDivision >= 4 * brazil.clubsPerDivision;
    if (!ok) issue("profile.brazil_range", "brazil");
    if (!countries.has("brasil")) issue("profile.unknown_country", "brazil", { geoId: "brasil" });
  }
  return issues;
}
