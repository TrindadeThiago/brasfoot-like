import { z } from "zod";
import { parseIsoDate } from "../calendar/date";
import { CREST_SHAPES, FORMAT_TYPES, POSITIONS, TIEBREAKERS, TRAITS } from "./catalogs";

/**
 * Schemas Zod do formato de banco v1 (data-model.md). As regras de faixa, tamanho e formato
 * carregam o código do projeto em `params.code`, para que a validação produza códigos próprios
 * em vez das mensagens do Zod.
 */

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const ABBREVIATION_PATTERN = /^[A-Z]{3}$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{3}$/;
const INITIALS_PATTERN = /^[\p{L}\p{N}]+$/u;

function intInRange(min: number, max: number) {
  return z.int().refine((value) => value >= min && value <= max, {
    params: { code: "schema.out_of_range", min, max },
  });
}

function text(min: number, max: number) {
  return z.string().refine((value) => value.length >= min && value.length <= max, {
    params: { code: "schema.invalid_length", min, max },
  });
}

function pattern(regex: RegExp, format: string) {
  return z.string().refine((value) => regex.test(value), {
    params: { code: "schema.invalid_format", format },
  });
}

function list<T extends z.ZodType>(item: T, min: number, max: number) {
  return z.array(item).refine((items) => items.length >= min && items.length <= max, {
    params: { code: "schema.invalid_length", min, max },
  });
}

const id = pattern(ID_PATTERN, "id");
const color = pattern(COLOR_PATTERN, "color");
const isoDate = z.string().refine((value) => parseIsoDate(value) !== null, {
  params: { code: "schema.invalid_format", format: "date" },
});
const scale = intInRange(1, 100);

export const manifestSchema = z.object({
  formatVersion: z.int(),
  id,
  name: text(1, 80),
  author: text(1, 80),
  version: pattern(SEMVER_PATTERN, "semver"),
  referenceDate: isoDate,
  description: text(0, 500).optional(),
});

export const countrySchema = z.object({
  id,
  name: text(1, 60),
  code: pattern(COUNTRY_CODE_PATTERN, "country-code"),
  /** Banco de nomes do país para jogadores gerados (009, research.md R10). */
  names: z.object({ firstNames: z.array(text(1, 30)), surnames: z.array(text(1, 30)) }).optional(),
});

export const leagueFormatSchema = z.object({
  type: z.enum(FORMAT_TYPES),
  rounds: intInRange(1, 4),
  points: z.object({
    win: intInRange(0, 10),
    draw: intInRange(0, 10),
    loss: intInRange(0, 10),
  }),
  tiebreakers: list(z.enum(TIEBREAKERS), 1, TIEBREAKERS.length),
});

export const divisionSchema = z.object({
  level: intInRange(1, 99),
  name: text(1, 60),
  clubIds: z.array(id),
  promotionSlots: intInRange(0, 40),
  relegationSlots: intInRange(0, 40),
});

const money = intInRange(0, 10_000_000_000);

/** Regras econômicas de uma divisão (008); campos ausentes usam os padrões do motor. */
export const divisionEconomySchema = z.object({
  level: intInRange(1, 99),
  referencePrice: intInRange(1, 100_000).optional(),
  fanFactorPct: intInRange(1, 1000).optional(),
  sponsorship: z
    .object({ base: money, perReputation: money, wageSharePct: intInRange(0, 200).optional() })
    .optional(),
  prizes: z.object({ first: money, last: money, title: money }).optional(),
  creditBase: money.optional(),
});

/** Regras econômicas da competição (008, research.md R11); tudo opcional. */
export const economySchema = z.object({
  fansBase: intInRange(0, 1_000_000).optional(),
  fansPerReputation: intInRange(0, 100_000).optional(),
  priceElasticityPct: intInRange(0, 1000)
    .refine((value) => value % 25 === 0, {
      params: { code: "schema.invalid_format", format: "multiple-of-25" },
    })
    .optional(),
  priceRange: z.object({ min: intInRange(1, 100_000), max: intInRange(1, 100_000) }).optional(),
  credit: z.object({ perReputation: money, interestBp: intInRange(0, 10_000) }).optional(),
  stadium: z
    .object({
      maxCapacity: intInRange(1000, 300_000),
      options: list(
        z.object({
          seats: intInRange(1, 100_000),
          cost: intInRange(1, 10_000_000_000),
          rounds: intInRange(1, 200),
        }),
        0,
        10,
      ),
    })
    .optional(),
  crisisRounds: intInRange(1, 200).optional(),
  wageFactorPct: intInRange(1, 1000).optional(),
  divisions: list(divisionEconomySchema, 0, 99).optional(),
});

export const competitionSchema = z.object({
  id,
  countryId: id,
  name: text(1, 80),
  format: leagueFormatSchema,
  divisions: list(divisionSchema, 1, 99),
  economy: economySchema.optional(),
});

export const crestSchema = z.object({
  shape: z.enum(CREST_SHAPES),
  colors: list(color, 2, 3),
  initials: text(1, 4).pipe(pattern(INITIALS_PATTERN, "initials")),
});

export const clubSchema = z.object({
  id,
  name: text(1, 60),
  shortName: text(1, 20),
  abbreviation: pattern(ABBREVIATION_PATTERN, "abbreviation"),
  city: text(1, 60),
  countryId: id,
  colors: z.object({ primary: color, secondary: color }),
  crest: crestSchema,
  reputation: scale,
  stadiumCapacity: intInRange(1000, 150000),
  initialCash: intInRange(-1000000000, 10000000000),
});

export const hiddenAttributesSchema = z.object({
  potential: scale.optional(),
  temperament: scale.optional(),
  injuryProneness: scale.optional(),
});

export const playerSchema = z.object({
  id,
  name: text(1, 80),
  displayName: text(1, 30),
  birthDate: isoDate,
  nationalityId: id,
  clubId: id,
  position: z.enum(POSITIONS),
  strength: scale,
  traits: list(z.enum(TRAITS), 0, 2),
  hidden: hiddenAttributesSchema.optional(),
});

/** Schema de cada item, por seção. A validação aplica um item por vez (research.md R8). */
export const SECTION_ITEM_SCHEMAS = {
  countries: countrySchema,
  competitions: competitionSchema,
  clubs: clubSchema,
  players: playerSchema,
} as const;

/** Número mínimo de itens por seção (data-model.md, ModPackage). */
export const SECTION_MIN_ITEMS = {
  countries: 1,
  competitions: 1,
  clubs: 2,
  players: 0,
} as const;
