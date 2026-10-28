import type { WorldProfile } from "./profile";
import { COMPACT_PROFILE } from "./profiles/compact";
import { DEFAULT_PROFILE, MEDIUM_PROFILE } from "./profiles/default";

export { buildConfederation, continentalSize } from "./confederation";
export { generateFootballWorld, LEAGUE_START_WEEK, ProfileError } from "./generate";
export { BRAZIL_STATES, GEO_COUNTRIES, geoCountry } from "./geo";
export { NAME_BANKS, nameBankOf } from "./names";
export type {
  BrazilSpec,
  Confederation,
  CountrySpec,
  ProfileIssue,
  Tier,
  WorldProfile,
} from "./profile";
export { TIERS, validateProfile } from "./profile";
export { COMPACT_PROFILE, DEFAULT_PROFILE, MEDIUM_PROFILE };

/** Os três tamanhos de mundo, do menor ao maior, com o id que a interface e a ferramenta usam. */
export const WORLD_SIZES = ["reduzido", "medio", "completo"] as const;
export type WorldSize = (typeof WORLD_SIZES)[number];

/** Perfil de cada tamanho: reduzido = 24 países; médio = 44 países e 12 estaduais; completo = 44 e 27. */
export function profileOfSize(size: WorldSize): WorldProfile {
  return size === "reduzido"
    ? COMPACT_PROFILE
    : size === "medio"
      ? MEDIUM_PROFILE
      : DEFAULT_PROFILE;
}
