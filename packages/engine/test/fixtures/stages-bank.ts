import type {
  Competition,
  CompletedBank,
  Country,
  GroupsStage,
  KnockoutPhase,
  KnockoutStage,
  ModPackage,
  StageFormat,
  ValidatedBank,
} from "../../src/model/types";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";
import { generateStagesBank, STAGES_REGION_SIZES } from "../../src/worldgen/stages-example";

// Bancos de teste das fases (019 research.md R15). Os nomes vêm do gerador fictício; o que muda é
// o formato da divisão de baixo (e, na variante continental, uma competição secundária).

/** Id da competição principal do gerador (a que contém a divisão em fases). */
export const STAGES_ID = "liga-nacional";
/** Nível da divisão disputada em fases. */
export const LOWER_LEVEL = 2;
/** Id da competição continental da variante `continentalBank`. */
export const CONTINENTAL_ID = "copa-continental";

const POINTS = { win: 3, draw: 1, loss: 0 };
const TIEBREAKERS: GroupsStage["tiebreakers"] = [
  "wins",
  "goal-difference",
  "goals-for",
  "head-to-head",
  "draw-lots",
];

const phase = (name: string, extra: Partial<KnockoutPhase> = {}): KnockoutPhase => ({
  name,
  legs: 1,
  tiebreakers: ["extra-time", "penalties"],
  home: "overall",
  prize: 0,
  ...extra,
});

/** Fases do mata-mata depois dos grupos: de `clubs` (potência de 2) até a final. */
export function knockoutAfterGroups(
  clubs: number,
  extra: Partial<KnockoutStage> = {},
): KnockoutStage {
  const names: Record<number, string> = {
    2: "Final",
    4: "Semifinal",
    8: "Quartas de final",
    16: "Oitavas de final",
  };
  const phases: KnockoutPhase[] = [];
  for (let count = clubs; count >= 2; count /= 2) {
    phases.push(
      phase(names[count] ?? `Fase de ${count}`, count === 2 ? { home: "draw", neutral: true } : {}),
    );
  }
  return { type: "knockout", phases, ...extra };
}

export function groupsStage(
  groupSize: number,
  qualified: number,
  extra: Partial<GroupsStage> = {},
): GroupsStage {
  return {
    type: "groups",
    groupSize,
    rounds: 1,
    points: POINTS,
    tiebreakers: TIEBREAKERS,
    qualified,
    ...extra,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Mantém só os `keep` primeiros clubes da divisão de cima (e seus jogadores e rivalidades). */
function trimTop(bank: ModPackage, keep: number): void {
  const competition = bank.competitions[0] as Competition;
  const top = competition.divisions[0];
  if (!top) return;
  const removed = new Set(top.clubIds.slice(keep));
  top.clubIds = top.clubIds.slice(0, keep);
  bank.clubs = bank.clubs.filter((club) => !removed.has(club.id));
  bank.players = bank.players.filter((player) => !removed.has(player.clubId));
  bank.rivalries = (bank.rivalries ?? []).filter(
    (rivalry) => !rivalry.clubIds.some((clubId) => removed.has(clubId)),
  );
}

/** Dá `region` aos clubes da divisão de baixo, em blocos de tamanhos dados (ordem de id). */
function assignRegions(bank: ModPackage, sizes: number[]): void {
  const lower = (bank.competitions[0] as Competition).divisions.find(
    (division) => division.level === LOWER_LEVEL,
  );
  const names = ["norte", "sul", "leste", "oeste", "centro", "litoral", "serra", "vale"];
  const ids = [...(lower?.clubIds ?? [])].sort();
  let cursor = 0;
  sizes.forEach((size, index) => {
    for (const clubId of ids.slice(cursor, cursor + size)) {
      const club = bank.clubs.find((entry) => entry.id === clubId);
      if (club) club.region = names[index] ?? `regiao-${index}`;
    }
    cursor += size;
  });
}

function base(divisionSize: number): ModPackage {
  return clone(
    generateDefaultBank({ seed: "brasfoot-like-default-1", divisionSize, slots: 2 }) as ModPackage,
  );
}

function setLowerStages(bank: ModPackage, stages: StageFormat[]): void {
  const lower = (bank.competitions[0] as Competition).divisions.find(
    (division) => division.level === LOWER_LEVEL,
  );
  if (lower) lower.stages = stages;
}

/** Tamanhos das regiões da divisão de baixo do banco regional (soma 20): 7, 5, 4 e 4 clubes. */
export const REGION_SIZES = STAGES_REGION_SIZES;

/**
 * Banco regional (aceite do spec): divisão de cima de 8 clubes em pontos corridos e a de baixo com
 * 20 clubes em 4 grupos de 5 (concentrados por região, 2 classificados por grupo) seguidos de
 * mata-mata de 8 clubes (quartas, semifinal e final). 2 vagas de acesso e 2 de rebaixamento.
 */
export function regionalPackage(): ModPackage {
  return clone(generateStagesBank({ topClubs: 8 }) as ModPackage);
}

/**
 * Banco com vagas extras: a divisão de baixo tem 24 clubes em 6 grupos de 4 (2 classificados por
 * grupo e as 4 melhores terceiras colocadas) seguidos de um mata-mata de 16 clubes.
 */
export function extrasPackage(): ModPackage {
  const bank = base(24);
  trimTop(bank, 8);
  assignRegions(bank, [6, 6, 6, 6]);
  setLowerStages(bank, [
    groupsStage(4, 2, {
      extra: 4,
      draw: { rules: [{ kind: "concentrate", attribute: "region" }] },
    }),
    knockoutAfterGroups(16),
  ]);
  return bank;
}

const COUNTRIES = ["val", "nor", "est", "sul"];

/**
 * Banco continental: a liga nacional comum e uma competição secundária de 28 clubes de 4 países
 * (quartas às quartas-feiras): fase preliminar eliminatória de 16 clubes (4 classificados), 4
 * grupos de 4 com 4 potes (o último, dos classificados da preliminar) e separação por país com esse
 * pote isento, e mata-mata de 8 clubes.
 */
export function continentalPackage(): ModPackage {
  const bank = base(20);
  const main = bank.competitions[0] as Competition;
  const picked = [
    ...(main.divisions[0]?.clubIds ?? []).slice(0, 14),
    ...(main.divisions[1]?.clubIds ?? []).slice(0, 14),
  ];
  // Países em rodízio pela ordem de reputação, para a separação ser possível: os 12 clubes que
  // entram direto nos grupos ficam 3 por país.
  const byReputation = [...picked].sort((a, b) => {
    const rep = (id: string) => bank.clubs.find((club) => club.id === id)?.reputation ?? 0;
    return rep(b) - rep(a) || (a < b ? -1 : 1);
  });
  byReputation.forEach((clubId, index) => {
    const club = bank.clubs.find((entry) => entry.id === clubId);
    if (club) club.countryId = COUNTRIES[index % COUNTRIES.length] as string;
  });
  const extraCountries: Country[] = COUNTRIES.filter((id) => id !== main.countryId).map((id) => ({
    id,
    name: `País ${id}`,
    code: id.toUpperCase().slice(0, 3).padEnd(3, "X"),
  }));
  bank.countries.push(
    ...extraCountries.filter((country) => !bank.countries.some((c) => c.id === country.id)),
  );
  const direct = byReputation.slice(0, 12);
  const continental: Competition = {
    id: CONTINENTAL_ID,
    countryId: main.countryId,
    name: "Copa Continental de Teste",
    format: {
      type: "stages",
      stages: [
        {
          type: "knockout",
          phases: [
            phase("Preliminar 1", { home: "ranking" }),
            phase("Preliminar 2", { home: "ranking" }),
          ],
        },
        groupsStage(4, 2, {
          enter: direct,
          draw: {
            pots: 4,
            previousStagePot: true,
            rules: [{ kind: "separate", attribute: "country", exemptPots: [4] }],
          },
        }),
        knockoutAfterGroups(8),
      ],
    },
    divisions: [
      {
        level: 1,
        name: "Chave",
        clubIds: [...picked].sort(),
        promotionSlots: 0,
        relegationSlots: 0,
      },
    ],
    schedule: { weekday: 3, startWeek: 1, everyWeeks: 1 },
  };
  bank.competitions.push(continental);
  return bank;
}

function completed(pkg: ModPackage): CompletedBank {
  return completeHiddenAttributes(pkg as ValidatedBank, "testes-fases");
}

export function regionalBank(): CompletedBank {
  return completed(regionalPackage());
}

export function extrasBank(): CompletedBank {
  return completed(extrasPackage());
}

export function continentalBank(): CompletedBank {
  return completed(continentalPackage());
}
