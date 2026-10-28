import type {
  Awards,
  Berth,
  Club,
  Competition,
  Country,
  GroupsStage,
  KnockoutPhase,
  KnockoutStage,
  StageFormat,
} from "../model/types";

/**
 * Competições entre países do banco de teste (022): a maior reúne os melhores clubes de cada país
 * em preliminar, grupos separados por país e mata-mata; as vagas por país vêm da liga e da copa
 * nacional (021) e da taça anterior. Só dados: nada aqui é regra do motor.
 */

/**
 * Tamanhos: `full` (40 clubes, 8 países ou mais), `compact` (16 clubes, 4 países ou mais) e `mini`
 * (12 clubes em 4 grupos de 3, a partir de 3 países).
 */
export type ContinentalSize = "full" | "compact" | "mini";

export const CONTINENTAL_IDS = { major: "continental-maior", minor: "continental-menor" } as const;

interface Layout {
  /** Participantes da competição. */
  total: number;
  /** Clubes que entram direto na fase de grupos (os demais disputam a preliminar). */
  direct: number;
  /** Grupos de 4: nenhum país pode ter mais clubes que isso na fase de grupos. */
  groups: number;
}

const LAYOUTS: Record<ContinentalSize, Layout> = {
  full: { total: 40, direct: 24, groups: 8 },
  compact: { total: 16, direct: 16, groups: 4 },
  mini: { total: 12, direct: 12, groups: 4 },
};

const POINTS = { win: 3, draw: 1, loss: 0 };
const TIEBREAKERS: GroupsStage["tiebreakers"] = [
  "wins",
  "goal-difference",
  "goals-for",
  "head-to-head",
  "draw-lots",
];

function phase(name: string, extra: Partial<KnockoutPhase> = {}): KnockoutPhase {
  return {
    name,
    legs: 2,
    tiebreakers: ["away-goals", "extra-time", "penalties"],
    home: "overall",
    prize: 0,
    ...extra,
  };
}

const FINAL = phase("Final", {
  legs: 1,
  tiebreakers: ["extra-time", "penalties"],
  home: "draw",
  neutral: true,
  gapWeeks: 1,
});

/**
 * Reparte `total` entre os países na proporção dos pesos (maiores restos), sem passar de `caps`.
 * Só soma, multiplicação e divisão: igual em qualquer engine.
 */
export function apportion(
  total: number,
  weights: readonly number[],
  caps: readonly number[],
): number[] {
  const result = caps.map(() => 0);
  let remaining = total;
  let open = caps.map((_, index) => index);
  while (remaining > 0 && open.length > 0) {
    const sum = open.reduce((acc, index) => acc + (weights[index] as number), 0);
    const shares = open.map((index) => ({
      index,
      exact: (remaining * (weights[index] as number)) / sum,
    }));
    for (const share of shares) {
      const room = (caps[share.index] as number) - (result[share.index] as number);
      const take = Math.min(Math.floor(share.exact), room);
      result[share.index] = (result[share.index] as number) + take;
      remaining -= take;
    }
    const byRemainder = shares
      .filter((share) => (result[share.index] as number) < (caps[share.index] as number))
      .sort(
        (a, b) =>
          b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)) || a.index - b.index,
      );
    for (const share of byRemainder) {
      if (remaining === 0) break;
      result[share.index] = (result[share.index] as number) + 1;
      remaining -= 1;
    }
    open = open.filter((index) => (result[index] as number) < (caps[index] as number));
  }
  if (remaining > 0) throw new Error("vagas continentais não cabem nos países do banco");
  return result;
}

interface CountrySlots {
  lower: string;
  league: Competition;
  cupId: string | undefined;
  /** Clubes da divisão de cima, do mais ao menos reputado (desempate por id). */
  ranked: string[];
  slots: number;
  direct: number;
}

function stagesOf(size: ContinentalSize, direct: string[]): StageFormat[] {
  const draw = {
    pots: 4,
    rules: [{ kind: "separate", attribute: "country" }],
  } as const;
  if (size !== "full") {
    const groupSize = size === "mini" ? 3 : 4;
    const groups: GroupsStage = {
      type: "groups",
      groupSize,
      rounds: 2,
      points: POINTS,
      tiebreakers: TIEBREAKERS,
      qualified: 2,
      draw: { ...draw, pots: groupSize, rules: [...draw.rules] },
    };
    const knockout: KnockoutStage = {
      type: "knockout",
      phases: [phase("Quartas de final"), phase("Semifinal"), FINAL],
    };
    return [groups, knockout];
  }
  const preliminary: KnockoutStage = {
    type: "knockout",
    phases: [phase("Fase preliminar", { home: "draw" })],
  };
  const groups: GroupsStage = {
    type: "groups",
    groupSize: 4,
    rounds: 2,
    points: POINTS,
    tiebreakers: TIEBREAKERS,
    qualified: 2,
    enter: [...direct].sort(),
    gapWeeks: 1,
    draw: { ...draw, previousStagePot: true, rules: [...draw.rules] },
  };
  const knockout: KnockoutStage = {
    type: "knockout",
    phases: [phase("Oitavas de final"), phase("Quartas de final"), phase("Semifinal"), FINAL],
  };
  return [preliminary, groups, knockout];
}

/**
 * Prêmios e reputação da taça maior de teste (022 R4, R5). A tabela de reputação soma perto de
 * zero por edição (quem cai cedo perde 1, o campeão ganha 3 ou 4), para a reputação não inflar; o
 * dinheiro vai pela metade no mundo compacto, de ligas curtas. Calibrado em `sim:world --continental`.
 */
function awardsFor(size: ContinentalSize): Awards {
  const knockout = size === "full" ? 3 : 2;
  const phases = size === "full" ? 4 : 3;
  const scale = size === "full" ? 0.85 : 0.4;
  const money = (value: number) => Math.round(value * scale);
  const entering =
    size === "full"
      ? [
          { stage: 1, amount: money(100_000) },
          { stage: 2, amount: money(150_000) },
        ]
      : [{ stage: 1, amount: money(150_000) }];
  const reputation =
    size === "full"
      ? [
          { reached: { stage: 1 }, points: -1 },
          { reached: { stage: 2 }, points: -1 },
          { reached: { stage: 3 }, points: 0 },
          { reached: { stage: 3, phase: 2 }, points: 1 },
          { reached: { stage: 3, phase: 3 }, points: 2 },
          { reached: { stage: 3, phase: 4 }, points: 3 },
          { reached: { stage: 3, phase: 5 }, points: 4 },
        ]
      : [
          { reached: { stage: 1 }, points: -1 },
          { reached: { stage: 2 }, points: 0 },
          { reached: { stage: 2, phase: 2 }, points: 1 },
          { reached: { stage: 2, phase: 3 }, points: 2 },
          { reached: { stage: 2, phase: 4 }, points: 3 },
        ];
  return {
    win: money(40_000),
    draw: money(15_000),
    stage: [
      ...entering,
      { stage: knockout, amount: money(250_000) },
      { stage: knockout, phase: phases - 1, amount: money(400_000) },
      { stage: knockout, phase: phases, amount: money(600_000) },
    ],
    title: money(800_000),
    reputation,
    reputationCeiling: 95,
  };
}

/**
 * Competição continental maior do banco de teste (022). `scales` é a escala econômica de cada país,
 * na ordem de `countries`: os países mais fortes recebem mais vagas. O campeão anterior ocupa uma
 * vaga a mais para o país mais forte quando já se classificou pelo caminho nacional.
 */
export interface ContinentalInput {
  size: ContinentalSize;
  /** Ids das competições (024: uma dupla por confederação); padrão `CONTINENTAL_IDS`. */
  ids?: { major: string; minor: string };
  /** Nomes das competições; padrão "Taça Continental" e "Copa Complementar". */
  names?: { major: string; minor: string };
  countries: readonly Country[];
  competitions: readonly Competition[];
  clubs: readonly Club[];
  scales: readonly number[];
}

/** O que a competição menor precisa saber da maior: vagas por país e o país mais forte. */
interface MajorPlan {
  countries: CountrySlots[];
  strongest: number;
  weights: number[];
  groupsStage: number;
}

export function continentalMajor(input: ContinentalInput): Competition {
  return buildMajor(input).competition;
}

function buildMajor(input: ContinentalInput): { competition: Competition; plan: MajorPlan } {
  const ids = input.ids ?? CONTINENTAL_IDS;
  const names = input.names ?? { major: "Taça Continental", minor: "Copa Complementar" };
  const layout = LAYOUTS[input.size];
  const reputation = new Map(input.clubs.map((club) => [club.id, club.reputation]));
  const strongest = input.scales.reduce(
    (best, scale, index) => (scale > (input.scales[best] as number) ? index : best),
    0,
  );

  const countries: CountrySlots[] = input.countries.map((country) => {
    const league = input.competitions.find(
      (competition) =>
        competition.countryId === country.id &&
        competition.format.type !== "knockout" &&
        competition.regional === undefined,
    ) as Competition;
    const cup = input.competitions.find(
      (competition) =>
        competition.countryId === country.id &&
        competition.format.type === "knockout" &&
        competition.id.startsWith("copa-"),
    );
    const top = league.divisions[0]?.clubIds ?? [];
    const ranked = [...top].sort(
      (a, b) => (reputation.get(b) ?? 0) - (reputation.get(a) ?? 0) || (a < b ? -1 : a > b ? 1 : 0),
    );
    return {
      lower: country.id,
      league,
      cupId: cup?.id,
      ranked,
      slots: 0,
      direct: 0,
    };
  });
  if (countries.length * layout.groups < layout.total) {
    throw new Error(
      `a competição ${input.size} pede ao menos ${Math.ceil(layout.total / layout.groups)} países`,
    );
  }

  const weights = input.scales.map((scale) => scale * scale * scale);
  // O campeão anterior é a vaga extra do país mais forte: ele reserva uma vaga na fase de grupos.
  const slotCaps = countries.map(
    (country, index) =>
      Math.min(country.ranked.length, layout.groups) - (index === strongest ? 1 : 0),
  );
  const slots = apportion(layout.total - 1, weights, slotCaps);
  const directCaps = slots.map((count, index) =>
    Math.min(count, layout.groups - (index === strongest ? 1 : 0)),
  );
  const direct = apportion(layout.direct - 1, weights, directCaps);
  countries.forEach((country, index) => {
    country.slots = slots[index] as number;
    country.direct = direct[index] as number;
  });

  const berths: Berth[] = [];
  const entry = input.size === "full" ? { entry: { stage: 2 } } : {};
  const clubIds: string[] = [];
  const entering: string[] = [];
  countries.forEach((country, index) => {
    // Fechamento do repasse: a tabela inteira da divisão de cima do próprio país.
    const fallback: Berth["fallback"] = [
      {
        kind: "position",
        competitionId: country.league.id,
        level: 1,
        from: 1,
        to: country.league.divisions[0]?.clubIds.length ?? 1,
      },
    ];
    const cupDirect = country.cupId !== undefined && country.direct >= 1;
    const leagueDirect = country.direct - (cupDirect ? 1 : 0);
    const preliminary = country.slots - country.direct;
    const cupPreliminary = country.cupId !== undefined && !cupDirect && preliminary >= 1;
    const leaguePreliminary = preliminary - (cupPreliminary ? 1 : 0);
    if (leagueDirect > 0) {
      berths.push({
        id: `${country.lower}-liga-direta`,
        source: {
          kind: "position",
          competitionId: country.league.id,
          level: 1,
          from: 1,
          to: leagueDirect,
        },
        ...entry,
        fallback,
      });
    }
    if (cupDirect && country.cupId) {
      berths.push({
        id: `${country.lower}-copa`,
        source: { kind: "champion", competitionId: country.cupId },
        ...entry,
        fallback,
      });
    }
    if (cupPreliminary && country.cupId) {
      berths.push({
        id: `${country.lower}-copa`,
        source: { kind: "champion", competitionId: country.cupId },
        fallback,
      });
    }
    if (leaguePreliminary > 0) {
      berths.push({
        id: `${country.lower}-liga-preliminar`,
        source: {
          kind: "position",
          competitionId: country.league.id,
          level: 1,
          from: leagueDirect + 1,
          to: leagueDirect + leaguePreliminary,
        },
        fallback,
      });
    }
    // Primeira temporada: os mais reputados do país, os primeiros entram direto.
    const chosen = country.ranked.slice(0, country.slots + (index === strongest ? 1 : 0));
    clubIds.push(...chosen);
    entering.push(...chosen.slice(0, country.direct + (index === strongest ? 1 : 0)));
  });
  const strongestLeague = (countries[strongest] as CountrySlots).league;
  berths.push({
    id: "campeao-anterior",
    source: { kind: "champion", competitionId: ids.major },
    ...entry,
    fallback: [
      {
        kind: "position",
        competitionId: strongestLeague.id,
        level: 1,
        from: 1,
        to: strongestLeague.divisions[0]?.clubIds.length ?? 1,
      },
    ],
  });

  const competition: Competition = {
    id: ids.major,
    name: names.major,
    format: { type: "stages", stages: stagesOf(input.size, entering) },
    divisions: [
      {
        level: 1,
        name: names.major,
        clubIds: [...clubIds].sort(),
        promotionSlots: 0,
        relegationSlots: 0,
        berths,
      },
    ],
    schedule: { weekday: 2, startWeek: 2, everyWeeks: 1 },
    awards: awardsFor(input.size),
  };
  return {
    competition,
    plan: { countries, strongest, weights, groupsStage: input.size === "full" ? 2 : 1 },
  };
}

/** Vagas da competição menor: `total` clubes, dos quais `late` entram na 2ª fase (compacta). */
const MINOR_LAYOUTS: Record<ContinentalSize, { total: number; late: number }> = {
  full: { total: 16, late: 0 },
  compact: { total: 6, late: 2 },
  mini: { total: 6, late: 2 },
};

/**
 * Competição continental menor (022 R3): preliminar entre clubes que ficaram fora da maior e, na
 * 2ª fase, os terceiros colocados dos grupos da maior, que descem durante a temporada (`dropIns`).
 */
function buildMinor(input: ContinentalInput, plan: MajorPlan): Competition {
  const ids = input.ids ?? CONTINENTAL_IDS;
  const names = input.names ?? { major: "Taça Continental", minor: "Copa Complementar" };
  const layout = MINOR_LAYOUTS[input.size];
  const { countries, strongest, weights } = plan;
  // Clubes livres de cada país: os que a competição maior não usa na primeira temporada.
  const start = countries.map((country, index) => country.slots + (index === strongest ? 1 : 0));
  const caps = countries.map((country, index) =>
    Math.min(4, Math.max(0, country.ranked.length - (start[index] as number))),
  );
  const slots = apportion(layout.total, weights, caps);
  const late = apportion(layout.late, weights, slots);

  const berths: Berth[] = [];
  const clubIds: string[] = [];
  const entering: string[] = [];
  countries.forEach((country, index) => {
    const count = slots[index] as number;
    if (count === 0) return;
    const second = late[index] as number;
    const first = start[index] as number;
    // Depois do que a maior usa na tabela do país; quem já está na maior passa adiante (`forbid`).
    const used = country.slots - (country.cupId ? 1 : 0) + (index === strongest ? 1 : 0);
    const fallback: Berth["fallback"] = [
      {
        kind: "position",
        competitionId: country.league.id,
        level: 1,
        from: 1,
        to: country.league.divisions[0]?.clubIds.length ?? 1,
      },
    ];
    const forbid = [{ competitionId: ids.major, level: 1 }];
    const source = (from: number, to: number) =>
      ({ kind: "position", competitionId: country.league.id, level: 1, from, to }) as const;
    if (second > 0) {
      berths.push({
        id: `${country.lower}-liga-tardia`,
        source: source(used + 1, used + second),
        entry: { stage: 2 },
        fallback,
        forbid,
      });
    }
    if (count - second > 0) {
      berths.push({
        id: `${country.lower}-liga-menor`,
        source: source(used + second + 1, used + count),
        fallback,
        forbid,
      });
    }
    const chosen = country.ranked.slice(first, first + count);
    clubIds.push(...chosen);
    entering.push(...chosen.slice(0, second));
  });

  const preliminary: KnockoutStage = {
    type: "knockout",
    phases: [phase("Fase preliminar", { home: "draw" })],
  };
  const final: KnockoutStage = {
    type: "knockout",
    phases:
      input.size === "full"
        ? [
            phase("Oitavas de final", { gapWeeks: 1 }),
            phase("Quartas de final"),
            phase("Semifinal"),
            FINAL,
          ]
        : [phase("Quartas de final", { gapWeeks: 1 }), phase("Semifinal"), FINAL],
    ...(entering.length > 0 ? { enter: [...entering].sort() } : {}),
  };
  return {
    id: ids.minor,
    name: names.minor,
    format: { type: "stages", stages: [preliminary, final] },
    divisions: [
      {
        level: 1,
        name: names.minor,
        clubIds: [...clubIds].sort(),
        promotionSlots: 0,
        relegationSlots: 0,
        berths,
        dropIns: [
          {
            id: "terceiros-dos-grupos",
            source: {
              kind: "position",
              competitionId: ids.major,
              stage: plan.groupsStage,
              from: 3,
              to: 3,
            },
            entry: { stage: 2 },
          },
        ],
      },
    ],
    // A 2ª fase só começa depois dos grupos da maior: na completa eles terminam bem mais tarde.
    schedule: { weekday: 4, startWeek: input.size === "full" ? 12 : 3, everyWeeks: 2 },
    awards: minorAwards(input.size),
  };
}

/** Prêmios da competição menor: uns 40% da maior (calibrados em `sim:world --continental`). */
function minorAwards(size: ContinentalSize): Awards {
  const knockout = 2;
  const phases = size === "full" ? 4 : 3;
  const scale = size === "full" ? 0.85 : 0.4;
  const money = (value: number) => Math.round(value * scale);
  return {
    win: money(15_000),
    draw: money(5_000),
    stage: [
      { stage: knockout, amount: money(100_000) },
      { stage: knockout, phase: phases - 1, amount: money(160_000) },
      { stage: knockout, phase: phases, amount: money(240_000) },
    ],
    title: money(320_000),
    reputation: [
      { reached: { stage: 1 }, points: -1 },
      { reached: { stage: 2 }, points: 0 },
      { reached: { stage: 2, phase: phases - 1 }, points: 1 },
      { reached: { stage: 2, phase: phases }, points: 1 },
      { reached: { stage: 2, phase: phases + 1 }, points: 2 },
    ],
    reputationCeiling: 90,
  };
}

/** As competições entre países do banco de teste: a maior e, se pedido, a menor ligada a ela. */
export function continentalCompetitions(
  input: ContinentalInput,
  options: { minor: boolean },
): Competition[] {
  const { competition, plan } = buildMajor(input);
  return options.minor ? [competition, buildMinor(input, plan)] : [competition];
}
