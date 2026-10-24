import type { z } from "zod";
import type {
  clubSchema,
  competitionFormatSchema,
  competitionSchema,
  countrySchema,
  crestSchema,
  divisionSchema,
  drawRuleSchema,
  groupDrawSchema,
  groupsStageSchema,
  hiddenAttributesSchema,
  knockoutFormatSchema,
  knockoutStageSchema,
  leagueFormatSchema,
  leagueStageSchema,
  manifestSchema,
  playerSchema,
  rivalrySchema,
  stageFormatSchema,
  stagesFormatSchema,
} from "./schemas";

export type { CrestShape, Position, Tiebreaker, Trait } from "./catalogs";

export type Manifest = z.infer<typeof manifestSchema>;
export type Country = z.infer<typeof countrySchema>;
export type LeagueFormat = z.infer<typeof leagueFormatSchema>;
export type KnockoutFormat = z.infer<typeof knockoutFormatSchema>;
export type KnockoutPhase = KnockoutFormat["phases"][number];
export type KnockoutEntry = NonNullable<KnockoutFormat["entries"]>[number];
export type LeagueStage = z.infer<typeof leagueStageSchema>;
export type GroupsStage = z.infer<typeof groupsStageSchema>;
export type KnockoutStage = z.infer<typeof knockoutStageSchema>;
export type StageFormat = z.infer<typeof stageFormatSchema>;
export type StagesFormat = z.infer<typeof stagesFormatSchema>;
export type GroupDraw = z.infer<typeof groupDrawSchema>;
export type DrawRule = z.infer<typeof drawRuleSchema>;
export type CompetitionFormat = z.infer<typeof competitionFormatSchema>;
export type Division = z.infer<typeof divisionSchema>;
export type Competition = z.infer<typeof competitionSchema>;
export type Crest = z.infer<typeof crestSchema>;
export type Club = z.infer<typeof clubSchema>;
export type HiddenAttributes = z.infer<typeof hiddenAttributesSchema>;
export type Player = z.infer<typeof playerSchema>;
export type Rivalry = z.infer<typeof rivalrySchema>;

export interface ModPackage {
  manifest: Manifest;
  countries: Country[];
  competitions: Competition[];
  clubs: Club[];
  players: Player[];
  /** Rivalidades (013); seção opcional do mod. */
  rivalries?: Rivalry[];
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
