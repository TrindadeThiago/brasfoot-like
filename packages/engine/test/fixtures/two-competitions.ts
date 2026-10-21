import type { Competition, CompletedBank, ModPackage } from "../../src/model/types";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { testWorld } from "../season/helpers/world";

/** Id da competição secundária do banco de teste (017 R14). */
export const TOURNAMENT_ID = "torneio-teste";

/** Clubes do torneio: 6 da primeira divisão e 4 da segunda, os primeiros de cada uma. */
function tournamentClubs(bank: { competitions: Competition[] }): string[] {
  const main = bank.competitions[0];
  const first = [...(main?.divisions[0]?.clubIds ?? [])].sort().slice(0, 6);
  const second = [...(main?.divisions[1]?.clubIds ?? [])].sort().slice(0, 4);
  return [...first, ...second];
}

type Edit = (tournament: Competition, bank: { competitions: Competition[] }) => void;

/**
 * Banco do mundo padrão com a principal no domingo (agenda explícita) e o "Torneio de Teste":
 * uma divisão de 10 clubes, ida e volta (18 rodadas), toda quarta a cada 2 semanas a partir da
 * semana 1 (017 R14). `edit` permite montar as variantes inválidas.
 */
function withTournament<T extends { competitions: Competition[] }>(base: T, edit?: Edit): T {
  const bank = JSON.parse(JSON.stringify(base)) as T;
  const main = bank.competitions[0] as Competition;
  main.schedule = { weekday: 7, startWeek: 0, everyWeeks: 1 };
  const tournament: Competition = {
    id: TOURNAMENT_ID,
    countryId: main.countryId,
    name: "Torneio de Teste",
    format: JSON.parse(JSON.stringify(main.format)),
    divisions: [
      {
        level: 1,
        name: "Divisão única",
        clubIds: tournamentClubs(bank),
        promotionSlots: 0,
        relegationSlots: 0,
      },
    ],
    schedule: { weekday: 3, startWeek: 1, everyWeeks: 2 },
  };
  edit?.(tournament, bank);
  bank.competitions.push(tournament);
  return bank;
}

/** Mundo de teste completo com as duas competições. */
export function twoCompetitionsBank(edit?: Edit): CompletedBank {
  return withTournament(testWorld(), edit);
}

/** O mesmo banco como pacote de mod (para a validação). */
export function twoCompetitionsPackage(edit?: Edit): ModPackage {
  return withTournament(generateDefaultBank({ seed: "brasfoot-like-default-1" }), edit);
}

/** O torneio joga no mesmo dia da semana da liga, com clubes em comum. */
export const sameWeekday: Edit = (tournament) => {
  tournament.schedule = { weekday: 7, startWeek: 1, everyWeeks: 2 };
};

/** O torneio tem 38 rodadas espaçadas de 2 semanas e não cabe nas 52 semanas. */
export const overflow: Edit = (tournament, bank) => {
  const main = bank.competitions[0] as Competition;
  tournament.divisions = [
    {
      level: 1,
      name: "Divisão única",
      clubIds: [...(main.divisions[0]?.clubIds ?? [])],
      promotionSlots: 0,
      relegationSlots: 0,
    },
  ];
  tournament.schedule = { weekday: 3, startWeek: 0, everyWeeks: 2 };
};

/** Um clube do torneio não está na competição principal. */
export const outsideMain: Edit = (tournament, bank) => {
  const second = bank.competitions[0]?.divisions[1];
  const removed = second?.clubIds.pop();
  if (!removed) throw new Error("sem clube para remover");
  (tournament.divisions[0] as { clubIds: string[] }).clubIds.push(removed);
};
