import type { Competition, CompletedBank, KnockoutPhase, ModPackage } from "../../src/model/types";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { testWorld } from "../season/helpers/world";

/** Id da copa do banco de teste (018). */
export const CUP_ID = "copa-teste";

const SINGLE: Pick<KnockoutPhase, "legs" | "tiebreakers" | "home"> = {
  legs: 1,
  tiebreakers: ["extra-time", "penalties"],
  home: "ranking",
};

/** Fases do banco de teste: oitavas, quartas, semifinal em ida e volta e final neutra. */
export function cupPhases(): KnockoutPhase[] {
  return [
    { name: "Oitavas", ...SINGLE, prize: 100_000 },
    { name: "Quartas", ...SINGLE, prize: 200_000 },
    {
      name: "Semifinal",
      legs: 2,
      tiebreakers: ["extra-time", "penalties"],
      home: "draw",
      prize: 400_000,
    },
    {
      name: "Final",
      ...SINGLE,
      home: "draw",
      neutral: true,
      prize: 800_000,
      gapWeeks: 1,
    },
  ];
}

type Edit = (cup: Competition, bank: { competitions: Competition[] }) => void;

/** Os `count` primeiros clubes (por id) de cada divisão da principal. */
function pick(bank: { competitions: Competition[] }, perDivision: number): string[] {
  const main = bank.competitions[0];
  return (main?.divisions ?? []).flatMap((division) =>
    [...division.clubIds].sort().slice(0, perDivision),
  );
}

/**
 * Banco com a copa de teste: 16 clubes (8 de cada divisão), agenda de quartas a cada 2 semanas
 * a partir da semana 1 (018 research.md R14). `edit` monta as variantes.
 */
function withCup<T extends { competitions: Competition[] }>(base: T, edit?: Edit): T {
  const bank = JSON.parse(JSON.stringify(base)) as T;
  const main = bank.competitions[0] as Competition;
  main.schedule = { weekday: 7, startWeek: 0, everyWeeks: 1 };
  const cup: Competition = {
    id: CUP_ID,
    countryId: main.countryId,
    name: "Copa de Teste",
    format: { type: "knockout", phases: cupPhases() },
    divisions: [
      { level: 1, name: "Chave", clubIds: pick(bank, 8), promotionSlots: 0, relegationSlots: 0 },
    ],
    schedule: { weekday: 3, startWeek: 1, everyWeeks: 2 },
  };
  edit?.(cup, bank);
  bank.competitions.push(cup);
  return bank;
}

export function cupBank(edit?: Edit): CompletedBank {
  return withCup(testWorld(), edit);
}

export function cupPackage(edit?: Edit): ModPackage {
  return withCup(generateDefaultBank({ seed: "brasfoot-like-default-1" }), edit);
}

function knockoutOf(cup: Competition) {
  if (cup.format.type !== "knockout") throw new Error("não é copa");
  return cup.format;
}

/**
 * Copa de 12 clubes: 8 na fase preliminar; 4 vencedores + 4 que entram na fase seguinte fecham as
 * quartas (8). Usada nos testes de entradas tardias.
 */
export const lateEntryCup: Edit = (cup, bank) => {
  const all = pick(bank, 6);
  const entering = all.slice(8);
  const format = knockoutOf(cup);
  cup.divisions = [
    { level: 1, name: "Chave", clubIds: all, promotionSlots: 0, relegationSlots: 0 },
  ];
  cup.format = {
    ...format,
    phases: [{ name: "Preliminar", ...SINGLE, prize: 50_000 }, ...cupPhases().slice(1)],
    entries: [{ phase: 1, clubIds: entering }],
  };
};

/** Fase com número ímpar de clubes (15 participantes). */
export const oddPhase: Edit = (cup) => {
  const [division] = cup.divisions;
  if (division) division.clubIds = division.clubIds.slice(0, 15);
};

/** Entrada numa fase que não existe. */
export const entryOutOfRange: Edit = (cup, bank) => {
  const format = knockoutOf(cup);
  const [first] = pick(bank, 1);
  cup.format = { ...format, entries: [{ phase: 6, clubIds: first ? [first] : [] }] };
};

/** Fase sem critério que sempre decida. */
export const noDecider: Edit = (cup) => {
  const format = knockoutOf(cup);
  cup.format = {
    ...format,
    phases: format.phases.map((phase, index) =>
      index === 1 ? { ...phase, tiebreakers: ["away-goals"] } : phase,
    ),
  };
};

/** Campo neutro numa fase de ida e volta. */
export const neutralTwoLegs: Edit = (cup) => {
  const format = knockoutOf(cup);
  cup.format = {
    ...format,
    phases: format.phases.map((phase, index) =>
      index === 2 ? { ...phase, neutral: true } : phase,
    ),
  };
};

/** Mais de uma divisão na copa. */
export const twoDivisions: Edit = (cup) => {
  const [first] = cup.divisions;
  if (!first) return;
  cup.divisions = [
    { ...first, clubIds: first.clubIds.slice(0, 8) },
    { ...first, level: 2, name: "Outra", clubIds: first.clubIds.slice(8) },
  ];
};

/** O mesmo clube em duas entradas. */
export const entryDuplicate: Edit = (cup, bank) => {
  const format = knockoutOf(cup);
  const [clubId] = pick(bank, 1);
  const id = clubId as string;
  cup.format = {
    ...format,
    entries: [
      { phase: 1, clubIds: [id] },
      { phase: 2, clubIds: [id] },
    ],
  };
};

/** Clube de entrada ausente da divisão da copa. */
export const entryNotParticipant: Edit = (cup, bank) => {
  const format = knockoutOf(cup);
  const outside = (bank.competitions[0]?.divisions[0]?.clubIds ?? [])
    .filter((clubId) => !(cup.divisions[0]?.clubIds ?? []).includes(clubId))
    .sort()[0] as string;
  cup.format = { ...format, entries: [{ phase: 1, clubIds: [outside] }] };
};
