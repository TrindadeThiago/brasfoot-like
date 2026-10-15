import type { z } from "zod";
import type {
  clubSchema,
  competitionSchema,
  countrySchema,
  crestSchema,
  divisionSchema,
  hiddenAttributesSchema,
  leagueFormatSchema,
  manifestSchema,
  playerSchema,
} from "./schemas.js";

export type { CrestShape, Position, Tiebreaker, Trait } from "./catalogs.js";

export type Manifest = z.infer<typeof manifestSchema>;
export type Country = z.infer<typeof countrySchema>;
export type CompetitionFormat = z.infer<typeof leagueFormatSchema>;
export type Division = z.infer<typeof divisionSchema>;
export type Competition = z.infer<typeof competitionSchema>;
export type Crest = z.infer<typeof crestSchema>;
export type Club = z.infer<typeof clubSchema>;
export type HiddenAttributes = z.infer<typeof hiddenAttributesSchema>;
export type Player = z.infer<typeof playerSchema>;

export interface ModPackage {
  manifest: Manifest;
  countries: Country[];
  competitions: Competition[];
  clubs: Club[];
  players: Player[];
}

declare const validatedBrand: unique symbol;
declare const completedBrand: unique symbol;

/** Banco aprovado por `validateBank`; dispensa novas verificações de consistência (FR-026). */
export type ValidatedBank = ModPackage & { readonly [validatedBrand]: true };

export interface CompleteHiddenAttributes {
  potential: number;
  temperament: number;
  injuryProneness: number;
}

/** Jogador com os três atributos ocultos preenchidos. */
export type CompletedPlayer = Omit<Player, "hidden"> & { hidden: CompleteHiddenAttributes };

/** Banco validado em que todo jogador tem atributos ocultos completos (FR-017b). */
export type CompletedBank = Omit<ValidatedBank, "players"> & {
  players: CompletedPlayer[];
  readonly [completedBrand]: true;
};
