import type {
  Club,
  Competition,
  Country,
  ModPackage,
  Player,
  Rivalry,
  ValidatedBank,
} from "../../model/types";
import { validateBank } from "../../validation/validate";
import { GENERATOR_TUNING } from "../tuning";
import { buildBrazil } from "./brazil";
import { buildConfederation } from "./confederation";
import { type BuiltCountry, buildCountry } from "./country";
import { geoCountry } from "./geo";
import { type ProfileIssue, validateProfile, type WorldProfile } from "./profile";

/** Semana em que as ligas nacionais começam; os estaduais ocupam as semanas anteriores. */
export const LEAGUE_START_WEEK = 8;

export class ProfileError extends Error {
  constructor(readonly issues: ProfileIssue[]) {
    super(`perfil inválido: ${issues.map((issue) => `${issue.code} ${issue.path}`).join("; ")}`);
  }
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Gera o mundo completo (024 R4): para cada confederação do perfil, na ordem dele, os países com
 * pirâmides, copas e (no Brasil) estaduais, e depois as competições continentais. Mesma seed e mesmo
 * perfil dão o mesmo banco. O banco sai validado, sem erros nem avisos.
 */
export function generateFootballWorld(profile: WorldProfile, seed: string): ValidatedBank {
  const problems = validateProfile(profile);
  if (problems.length > 0) throw new ProfileError(problems);
  const referenceDate = GENERATOR_TUNING.referenceDate;
  const abbreviations = new Set<string>();
  const countries: Country[] = [];
  const competitions: Competition[] = [];
  const clubs: Club[] = [];
  const players: Player[] = [];
  const rivalries: Rivalry[] = [];
  const continental: Competition[] = [];

  for (const confederation of profile.confederations) {
    const built: BuiltCountry[] = [];
    for (const spec of confederation.countries) {
      const geo = geoCountry(spec.geoId);
      if (!geo) throw new Error(`país sem geografia: ${spec.geoId}`);
      const common = {
        spec,
        geo,
        seed,
        referenceDate,
        abbreviations,
        leagueStartWeek: LEAGUE_START_WEEK,
      };
      built.push(
        spec.geoId === "brasil" && profile.brazil
          ? buildBrazil({ ...common, brazil: profile.brazil })
          : buildCountry(common),
      );
    }
    for (const item of built) {
      countries.push(item.country);
      competitions.push(...item.competitions);
      clubs.push(...item.clubs);
      players.push(...item.players);
      rivalries.push(...item.rivalries);
    }
    continental.push(
      ...buildConfederation({
        confederation,
        countries: built.map((item) => item.country),
        competitions: built.flatMap((item) => item.competitions),
        clubs: built.flatMap((item) => item.clubs),
        strengths: confederation.countries.map((spec) => spec.strength),
      }),
    );
  }

  const seen = new Set<string>();
  const pairs = rivalries.filter((rivalry) => {
    const key = rivalry.clubIds.join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const bank: ModPackage = {
    manifest: { formatVersion: 1, ...profile.manifest, referenceDate },
    countries,
    competitions: [...competitions, ...continental],
    clubs: clubs.sort(byId),
    players,
    rivalries: pairs,
  };
  const result = validateBank(bank);
  if (!result.ok || result.warnings.length > 0) {
    const issues = result.ok ? result.warnings : [...result.errors, ...result.warnings];
    throw new Error(
      `mundo gerado inválido (bug do gerador): ${JSON.stringify(issues.slice(0, 6))}`,
    );
  }
  return result.bank;
}
