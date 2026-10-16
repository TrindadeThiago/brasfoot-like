import type { Club, ModPackage, Player, Position } from "../../src/model/types";

const SQUAD_POSITIONS: Position[] = [
  "GK",
  "GK",
  "FB",
  "FB",
  "FB",
  "CB",
  "CB",
  "CB",
  "DM",
  "DM",
  "MF",
  "MF",
  "MF",
  "FW",
  "FW",
  "FW",
];

const ABBREVIATIONS = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH"];

function makeClub(index: number): Club {
  const number = index + 1;
  return {
    id: `clube-${number}`,
    name: `Clube de Teste ${number}`,
    shortName: `Teste ${number}`,
    abbreviation: ABBREVIATIONS[index] ?? "ZZZ",
    city: `Cidade ${number}`,
    countryId: "pais-1",
    colors: { primary: "#112233", secondary: "#FFFFFF" },
    crest: { shape: "classic", colors: ["#112233", "#FFFFFF"], initials: `CT${number}` },
    reputation: 50,
    stadiumCapacity: 20000,
    initialCash: 1000000,
  };
}

function makePlayers(clubId: string): Player[] {
  return SQUAD_POSITIONS.map((position, index) => ({
    id: `${clubId}-jog-${index + 1}`,
    name: `Jogador ${index + 1} do ${clubId}`,
    displayName: `Jogador ${index + 1}`,
    birthDate: "2000-01-15",
    nationalityId: "pais-1",
    clubId,
    position,
    strength: 50,
    traits: [],
  }));
}

/**
 * Banco pequeno e válido: 1 país, 1 liga com 2 divisões de 4 clubes (1 sobe / 1 desce),
 * 16 jogadores por clube com 2 goleiros, sem atributos ocultos. Cada chamada devolve um objeto
 * novo, que os testes podem alterar livremente.
 */
export function makeValidBank(): ModPackage {
  const clubs = Array.from({ length: 8 }, (_, index) => makeClub(index));
  return {
    manifest: {
      formatVersion: 1,
      id: "teste",
      name: "Banco de teste",
      author: "testes",
      version: "1.0.0",
      referenceDate: "2027-01-01",
    },
    countries: [{ id: "pais-1", name: "País de Teste", code: "TST" }],
    competitions: [
      {
        id: "liga",
        countryId: "pais-1",
        name: "Liga de Teste",
        format: {
          type: "league",
          rounds: 2,
          points: { win: 3, draw: 1, loss: 0 },
          tiebreakers: ["wins", "goal-difference"],
        },
        divisions: [
          {
            level: 1,
            name: "Divisão 1",
            clubIds: ["clube-1", "clube-2", "clube-3", "clube-4"],
            promotionSlots: 0,
            relegationSlots: 1,
          },
          {
            level: 2,
            name: "Divisão 2",
            clubIds: ["clube-5", "clube-6", "clube-7", "clube-8"],
            promotionSlots: 1,
            relegationSlots: 0,
          },
        ],
      },
    ],
    clubs,
    players: clubs.flatMap((club) => makePlayers(club.id)),
  };
}

/** Atribui um valor qualquer (inclusive de tipo inválido) ignorando a tipagem. */
export function setRaw(target: object, key: string, value: unknown): void {
  (target as Record<string, unknown>)[key] = value;
}

/** Remove um campo ignorando a tipagem. */
export function removeField(target: object, key: string): void {
  delete (target as Record<string, unknown>)[key];
}

/** Acesso tipado a itens que os testes sabem existir. */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`índice ${index} inexistente`);
  }
  return item;
}
