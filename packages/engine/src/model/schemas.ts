import { z } from "zod";
import { parseIsoDate } from "../calendar/date";
import {
  CREST_SHAPES,
  DRAW_ATTRIBUTES,
  KNOCKOUT_HOME_RULES,
  KNOCKOUT_TIEBREAKERS,
  POSITIONS,
  TIEBREAKERS,
  TRAITS,
} from "./catalogs";

/**
 * Schemas Zod do formato de banco v1 (data-model.md). As regras de faixa, tamanho e formato
 * carregam o código do projeto em `params.code`, para que a validação produza códigos próprios
 * em vez das mensagens do Zod.
 */

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
const ABBREVIATION_PATTERN = /^[A-Z]{3}$/;
/** Origem de uma vaga numa tabela de confrontos (019 R7): `A1` (1º do Grupo A), `T3`, `X1`. */
const ORIGIN_PATTERN = /^([A-Z]\d{1,2}|T\d{1,2}|X\d{1,2})$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{3}$/;
const INITIALS_PATTERN = /^[\p{L}\p{N}]+$/u;
/** Imagem de escudo dentro do pacote (015): `images/…` em PNG, JPEG ou WebP. */
const CREST_IMAGE_PATTERN = /^images\/[A-Za-z0-9._\-/]+\.(png|jpe?g|webp)$/i;

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
  /** Regras próprias do país (020): limite opcional de jogadores estrangeiros por clube. */
  rules: z.object({ foreignLimit: intInRange(0, 25).optional() }).optional(),
});

const pointsSchema = z.object({
  win: intInRange(0, 10),
  draw: intInRange(0, 10),
  loss: intInRange(0, 10),
});

export const leagueFormatSchema = z.object({
  type: z.literal("league"),
  rounds: intInRange(1, 4),
  points: pointsSchema,
  tiebreakers: list(z.enum(TIEBREAKERS), 1, TIEBREAKERS.length),
});

/** Fase de uma copa (018 R2): jogo único ou ida e volta, desempate, mando, sorteio e prêmio. */
export const knockoutPhaseSchema = z.object({
  name: text(1, 40),
  legs: z.union([z.literal(1), z.literal(2)]),
  tiebreakers: list(z.enum(KNOCKOUT_TIEBREAKERS), 1, KNOCKOUT_TIEBREAKERS.length),
  neutral: z.boolean().optional(),
  home: z.enum(KNOCKOUT_HOME_RULES),
  seeded: z.boolean().optional(),
  prize: intInRange(0, 1_000_000_000),
  gapWeeks: intInRange(0, 8).optional(),
  neutralCapacity: intInRange(1000, 150000).optional(),
});

/** Clubes que só entram na copa numa fase posterior à primeira. */
export const knockoutEntrySchema = z.object({
  phase: intInRange(1, 7),
  clubIds: z.array(id),
});

export const knockoutFormatSchema = z.object({
  type: z.literal("knockout"),
  phases: list(knockoutPhaseSchema, 1, 8),
  entries: z.array(knockoutEntrySchema).optional(),
});

/** Pontos corridos como fase de uma sequência (019 R1): a liga mais quem avança e quem entra. */
export const leagueStageSchema = leagueFormatSchema.extend({
  qualified: intInRange(1, 40).optional(),
  enter: z.array(id).optional(),
  gapWeeks: intInRange(0, 8).optional(),
});

/** Regra de sorteio dos grupos (019 R6): separação (obrigatória) ou concentração (preferência). */
export const drawRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("separate"),
    attribute: z.enum(DRAW_ATTRIBUTES),
    exemptPots: z.array(intInRange(1, 8)).optional(),
  }),
  z.object({ kind: z.literal("concentrate"), attribute: z.literal("region") }),
]);

export const groupDrawSchema = z.object({
  pots: intInRange(2, 8).optional(),
  previousStagePot: z.boolean().optional(),
  rules: list(drawRuleSchema, 0, 8).optional(),
});

/** Fase de grupos (019): tamanho, turnos, pontuação, classificados e sorteio. */
export const groupsStageSchema = z.object({
  type: z.literal("groups"),
  groupSize: intInRange(3, 8),
  rounds: z.union([z.literal(1), z.literal(2)]),
  points: pointsSchema,
  tiebreakers: list(z.enum(TIEBREAKERS), 1, TIEBREAKERS.length),
  qualified: intInRange(1, 7).optional(),
  extra: intInRange(0, 16).optional(),
  enter: z.array(id).optional(),
  gapWeeks: intInRange(0, 8).optional(),
  draw: groupDrawSchema.optional(),
});

/** Mata-mata como fase de uma sequência: a copa da 018 mais pareamento e entradas (019 R7). */
export const knockoutStageSchema = knockoutFormatSchema.extend({
  pairing: z.enum(["position", "draw"]).optional(),
  pairs: z
    .array(z.tuple([pattern(ORIGIN_PATTERN, "origin"), pattern(ORIGIN_PATTERN, "origin")]))
    .optional(),
  enter: z.array(id).optional(),
});

export const stageFormatSchema = z.discriminatedUnion("type", [
  leagueStageSchema,
  groupsStageSchema,
  knockoutStageSchema,
]);

export const stagesFormatSchema = z.object({
  type: z.literal("stages"),
  stages: list(stageFormatSchema, 1, 8),
});

export const competitionFormatSchema = z.discriminatedUnion("type", [
  leagueFormatSchema,
  knockoutFormatSchema,
  groupsStageSchema,
  stagesFormatSchema,
]);

/** Divisão (competição, nível) de que um clube precisa, ou não pode, fazer parte (021 R1). */
export const divisionRefSchema = z.object({ competitionId: id, level: intInRange(1, 99) });

/** De onde vem o clube de uma vaga (021 R1). */
export const berthSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("position"),
    competitionId: id,
    level: intInRange(1, 99),
    from: intInRange(1, 40),
    to: intInRange(1, 40),
  }),
  z.object({ kind: z.literal("champion"), competitionId: id }),
  z.object({ kind: z.literal("runnerUp"), competitionId: id }),
  z.object({ kind: z.literal("reached"), competitionId: id, phase: intInRange(1, 8) }),
]);

/** Vaga de uma divisão em outra competição (021): fonte, fase de entrada, repasse e condições. */
export const berthSchema = z.object({
  id,
  source: berthSourceSchema,
  entry: z
    .object({ stage: intInRange(1, 8).optional(), phase: intInRange(1, 8).optional() })
    .optional(),
  fallback: list(berthSourceSchema, 0, 8).optional(),
  require: list(divisionRefSchema, 0, 8).optional(),
  forbid: list(divisionRefSchema, 0, 8).optional(),
});

export const divisionSchema = z.object({
  level: intInRange(1, 99),
  name: text(1, 60),
  clubIds: z.array(id),
  promotionSlots: intInRange(0, 40),
  relegationSlots: intInRange(0, 40),
  /** Fases desta divisão; substituem o formato da competição (019 R1). */
  stages: list(stageFormatSchema, 1, 8).optional(),
  /** Vagas vindas de outras competições (021); `clubIds` são os participantes da 1ª temporada. */
  berths: list(berthSchema, 1, 64).optional(),
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

const pct = intInRange(0, 1000);

/** Regras do mercado de transferências (010, research.md R5–R11); tudo opcional. */
export const marketSchema = z.object({
  windows: list(
    z.object({ fromRound: intInRange(0, 200), toRound: intInRange(0, 200) }),
    0,
    8,
  ).optional(),
  contractYears: z
    .object({
      min: intInRange(1, 10),
      max: intInRange(1, 10),
      veteranAge: intInRange(25, 50),
      veteranMax: intInRange(1, 10),
    })
    .optional(),
  lastYearValuePct: pct.optional(),
  twoYearsValuePct: pct.optional(),
  club: z
    .object({
      counterThresholdPct: pct,
      keyPlayerPct: pct,
      noiseMinPct: pct,
      noiseMaxPct: pct,
      maxBidMinPct: pct,
      maxBidMaxPct: pct,
      loanFeePct: pct,
    })
    .optional(),
  player: z
    .object({
      demandThresholdPct: pct,
      interestMargin: intInRange(0, 100),
      divisionBonus: list(z.int(), 1, 99),
    })
    .optional(),
  incoming: z
    .object({
      chancePct: intInRange(0, 100),
      maxOpen: intInRange(0, 20),
      expireRounds: intInRange(1, 50),
      minPct: pct,
      maxPct: pct,
      cashBufferMonths: intInRange(0, 60),
    })
    .optional(),
  freeAgents: z.object({ maxSeasons: intInRange(0, 10), retireAge: intInRange(30, 50) }).optional(),
  aiMarket: z
    .object({
      weakGap: intInRange(0, 50),
      targetBase: intInRange(0, 100),
      targetPerAmbitionPct: intInRange(0, 100),
      oldSquadAge: intInRange(18, 40),
      reserveMonths: intInRange(0, 60),
      minGain: intInRange(0, 50),
      youthBonus: intInRange(0, 50),
      maxBuysPerWindow: intInRange(0, 20),
      maxSalesPerWindow: intInRange(0, 20),
      maxDealsPerRound: intInRange(0, 200),
      upwardMargin: intInRange(0, 100),
      surplusDiscountPct: intInRange(1, 100),
      loanMaxAge: intInRange(15, 30),
      loanMinPotential: intInRange(1, 100),
      loanBenchRank: intInRange(1, 60),
      maxFreeSigningsPerRound: intInRange(0, 100),
      positionMax: z
        .object({
          GK: intInRange(1, 30),
          FB: intInRange(1, 30),
          CB: intInRange(1, 30),
          DM: intInRange(1, 30),
          MF: intInRange(1, 30),
          FW: intInRange(1, 30),
        })
        .partial(),
      keepReports: intInRange(1, 20),
      maxInternationalPerClub: intInRange(0, 20),
    })
    .partial()
    .optional(),
  ai: z
    .object({
      renewMaxAge: intInRange(20, 50),
      renewTopN: intInRange(1, 60),
      wageReviewPct: intInRange(0, 200),
    })
    .optional(),
});

/** Regras da diretoria (012, research.md R17); tudo opcional. */
export const boardSchema = z
  .object({
    expectationRepPct: intInRange(0, 1000),
    slackBase: intInRange(0, 100),
    slackPerRepPct: intInRange(0, 1000),
    bottomSlots: intInRange(0, 100),
    tightMonths: intInRange(0, 60),
    neutral: intInRange(0, 100),
    win: intInRange(0, 100),
    draw: intInRange(0, 100),
    loss: intInRange(0, 100),
    goalCheckFromRound: intInRange(0, 100),
    gapWeight: intInRange(0, 100),
    aheadWeight: intInRange(0, 100),
    aheadCap: intInRange(0, 100),
    driftDivisor: intInRange(1, 100),
    crisisPenalty: intInRange(0, 100),
    financePenalty: intInRange(0, 100),
    patienceBasePct: intInRange(0, 1000),
    patiencePerRepPct: intInRange(0, 1000),
    patienceMinPct: intInRange(0, 1000),
    keepRecent: intInRange(1, 100),
    fireThreshold: intInRange(0, 100),
    graceRounds: intInRange(0, 100),
    endFireThreshold: intInRange(0, 100),
    sportMetBonus: intInRange(0, 100),
    missPerPosition: intInRange(0, 100),
    missCap: intInRange(0, 100),
    financeMetBonus: intInRange(0, 100),
    financeMissPenalty: intInRange(0, 100),
    aiFireChancePct: intInRange(0, 100),
    initialReputation: intInRange(1, 100),
    metBase: intInRange(0, 100),
    upsidePct: intInRange(0, 1000),
    missBase: intInRange(0, 100),
    titleBonus: intInRange(0, 100),
    promotionBonus: intInRange(0, 100),
    relegationPenalty: intInRange(0, 100),
    firePenalty: intInRange(0, 100),
    downsidePct: intInRange(0, 1000),
    vacancyRounds: intInRange(0, 50),
    lowerMargin: intInRange(0, 100),
    upperMargin: intInRange(0, 100),
    offerChancePct: intInRange(0, 100),
    maxOpenOffers: intInRange(0, 100),
    offerRounds: intInRange(1, 50),
    maxFreeCoaches: intInRange(0, 200),
    coachSpread: intInRange(0, 100),
    derbyPct: intInRange(0, 200),
    cupOut: intInRange(0, 100),
    cupTitle: intInRange(0, 100),
    cupGoal: intInRange(0, 100),
  })
  .partial();

/** Regras das manchetes (014, research.md R12); tudo opcional. */
const headlineMap = (max: number) =>
  z
    .object({
      result: intInRange(0, max),
      hatTrick: intInRange(0, max),
      rout: intInRange(0, max),
      comeback: intInRange(0, max),
      upset: intInRange(0, max),
      derby: intInRange(0, max),
      streak: intInRange(0, max),
      droughtEnd: intInRange(0, max),
      record: intInRange(0, max),
      coachFired: intInRange(0, max),
      coachHired: intInRange(0, max),
      managerFired: intInRange(0, max),
      managerHired: intInRange(0, max),
      bigTransfer: intInRange(0, max),
      titleClinched: intInRange(0, max),
      promotionClinched: intInRange(0, max),
      relegationConfirmed: intInRange(0, max),
      seasonSummary: intInRange(0, max),
      cupUpset: intInRange(0, max),
      cupElimination: intInRange(0, max),
      cupFinal: intInRange(0, max),
      cupChampion: intInRange(0, max),
      qualification: intInRange(0, max),
    })
    .partial();

export const newsSchema = z
  .object({
    routMargin: intInRange(1, 20),
    upsetGap: intInRange(1, 40),
    streakMin: intInRange(2, 40),
    droughtMin: intInRange(2, 40),
    bigTransferPct: intInRange(0, 100),
    relevance: headlineMap(1000),
    mineBonus: intInRange(0, 1000),
    feedLimit: intInRange(1, 50),
    homeLimit: intInRange(1, 20),
    extrasPerMatch: intInRange(0, 5),
    allTimeTop: intInRange(1, 1000),
    legendsPerClub: intInRange(1, 100),
    variants: headlineMap(20),
  })
  .partial();

/** Regras da torcida (013, research.md R14); tudo opcional. */
export const fansSchema = z
  .object({
    neutral: intInRange(0, 100),
    win: intInRange(0, 100),
    draw: intInRange(0, 100),
    loss: intInRange(0, 100),
    checkFromRound: intInRange(0, 100),
    gapWeight: intInRange(0, 100),
    aheadWeight: intInRange(0, 100),
    aheadCap: intInRange(0, 100),
    driftDivisor: intInRange(1, 100),
    calmDivisor: intInRange(1, 100),
    keepRecent: intInRange(1, 100),
    derbyPct: intInRange(0, 200),
    idolCount: intInRange(0, 20),
    idolLoss: intInRange(0, 100),
    starSigning: intInRange(0, 100),
    gateSwingPct: intInRange(0, 100),
    fanPressureBelow: intInRange(0, 100),
    fanSupportAbove: intInRange(0, 100),
    fanDivisor: intInRange(1, 100),
    carryPct: intInRange(0, 100),
    titleBoost: intInRange(0, 100),
    promotionBoost: intInRange(0, 100),
    relegationDrop: intInRange(0, 100),
    cupOut: intInRange(0, 100),
    cupTitle: intInRange(0, 100),
    bands: z.tuple([
      intInRange(0, 100),
      intInRange(0, 100),
      intInRange(0, 100),
      intInRange(0, 100),
    ]),
  })
  .partial();

/** Agenda da competição (017 R1): campos ausentes assumem `DEFAULT_SCHEDULE`. */
const scheduleSchema = z
  .object({
    weekday: intInRange(1, 7),
    startWeek: intInRange(0, 51),
    everyWeeks: intInRange(1, 4),
  })
  .partial();

/** Regras de cartões da competição (017 R6): campos ausentes assumem as regras atuais da liga. */
const disciplineSchema = z
  .object({
    yellowsForSuspension: intInRange(1, 10),
    matchesPerRed: intInRange(1, 10),
  })
  .partial();

/** Condição física (017 R5), lida da competição principal: campos ausentes assumem `DEFAULT_FITNESS`. */
const fitnessSchema = z
  .object({
    drainPer90: intInRange(0, 100),
    recoveryPerDay: intInRange(0, 100),
    penaltyBpPerPoint: intInRange(0, 100),
  })
  .partial();

export const competitionSchema = z.object({
  id,
  countryId: id,
  name: text(1, 80),
  format: competitionFormatSchema,
  divisions: list(divisionSchema, 1, 99),
  economy: economySchema.optional(),
  market: marketSchema.optional(),
  board: boardSchema.optional(),
  fans: fansSchema.optional(),
  news: newsSchema.optional(),
  schedule: scheduleSchema.optional(),
  discipline: disciplineSchema.optional(),
  fitness: fitnessSchema.optional(),
});

export const crestSchema = z.object({
  shape: z.enum(CREST_SHAPES),
  colors: list(color, 2, 3),
  initials: text(1, 4).pipe(pattern(INITIALS_PATTERN, "initials")),
  /** Imagem que substitui o escudo gerado (opcional). */
  image: text(8, 120).pipe(pattern(CREST_IMAGE_PATTERN, "crest-image")).optional(),
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
  /** Região do clube, usada pelas regras de sorteio dos grupos (019). */
  region: text(1, 40).optional(),
});

export const hiddenAttributesSchema = z.object({
  potential: scale.optional(),
  temperament: scale.optional(),
  injuryProneness: scale.optional(),
});

/** Contrato do jogador (010, data-model.md): salário mensal, último ano e empréstimo. */
export const contractSchema = z.object({
  wage: money,
  untilYear: intInRange(0, 10_000),
  loan: z.object({ fromClubId: id, untilYear: intInRange(0, 10_000) }).optional(),
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
  contract: contractSchema.optional(),
});

/** Schema de cada item, por seção. A validação aplica um item por vez (research.md R8). */
/** Rivalidade entre dois clubes (013, research.md R1); intensidade 1 a 3. */
export const rivalrySchema = z.object({
  clubIds: z.tuple([id, id]),
  intensity: intInRange(1, 3),
});

export const SECTION_ITEM_SCHEMAS = {
  countries: countrySchema,
  competitions: competitionSchema,
  clubs: clubSchema,
  players: playerSchema,
  rivalries: rivalrySchema,
} as const;

/** Seções que o mod pode omitir (ausente = lista vazia). */
export const OPTIONAL_SECTIONS: readonly string[] = ["rivalries"];

/** Número mínimo de itens por seção (data-model.md, ModPackage). */
export const SECTION_MIN_ITEMS = {
  countries: 1,
  competitions: 1,
  clubs: 2,
  players: 0,
  rivalries: 0,
} as const;
