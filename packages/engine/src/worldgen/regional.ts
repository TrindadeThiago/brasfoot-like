import { CREST_SHAPES, POSITIONS, type Position } from "../model/catalogs";
import type {
  Club,
  Competition,
  KnockoutPhase,
  ModPackage,
  Player,
  Rivalry,
  StageFormat,
  ValidatedBank,
} from "../model/types";
import { createRng, type Rng } from "../rng/xoshiro";
import { validateBank } from "../validation/validate";
import type { GeneratedClub } from "./clubs";
import { generateDefaultBank } from "./generate";
import defaultNameBank from "./name-banks/default.json" with { type: "json" };
import { type NameBank, nameBankSchema } from "./name-banks/schema";
import { generateSquad } from "./players";
import { generateRivalries } from "./rivalries";
import { GENERATOR_TUNING } from "./tuning";

/**
 * Banco de teste dos estaduais (023 R9): um país com a liga nacional de duas divisões e, por
 * estado, um estadual de duas divisões. Os clubes nacionais jogam o estadual da região deles; o
 * resto dos lugares é de clubes regionais (elenco menor, reputação e caixa menores). Serve ao teste
 * de 30 temporadas, à medição de escala e ao mod de exemplo. O banco padrão do jogo não usa nada
 * disto.
 */

export interface RegionalBankOptions {
  seed: string;
  /** Número de estados (padrão 27, máximo 40). */
  states?: number;
  /** Clubes na 1ª divisão de cada estadual (padrão 12; múltiplo de 4). */
  firstDivisionClubs?: number;
  /** Clubes na 2ª divisão de cada estadual (padrão 8; múltiplo de 4). */
  secondDivisionClubs?: number;
  /** Clubes de cada divisão nacional (padrão 20). */
  nationalClubsPerDivision?: number;
  /** Semana em que a liga nacional começa; o estadual ocupa as semanas anteriores (padrão 8). */
  nationalStartWeek?: number;
  /** Identificação do mod gerado. */
  manifest?: { id: string; name: string; author: string; version: string };
}

const ONSETS = ["k", "b", "l", "m", "t", "r", "v", "s", "d", "n", "p", "z", "f", "g", "h", "j"];
const VOWELS = ["a", "e", "i", "o", "u"];
const CODAS = ["", "n", "r", "l", "s", "m", "k", "d"];
const ENDINGS = ["o", "a", "e", "i", "u", "on", "an", "el", "ar", "is"];

/** Tamanho do elenco de um clube regional: mínimo por posição e os dois melhores restantes. */
const REGIONAL_SQUAD_MIN: Record<Position, number> = { GK: 2, FB: 3, CB: 3, DM: 2, MF: 3, FW: 3 };
const REGIONAL_SQUAD_EXTRA = 2;

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** `count` palavras distintas e pronunciáveis. */
function uniqueWords(rng: Rng, count: number, maxLength: number, taken: Set<string>): string[] {
  const result: string[] = [];
  let attempts = 0;
  while (result.length < count) {
    attempts += 1;
    if (attempts > count * 600) throw new Error("sem variedade de nomes para os estaduais");
    const syllables = Array.from(
      { length: rng.int(1, 3) },
      () => `${rng.pick(ONSETS)}${rng.pick(VOWELS)}${rng.pick(CODAS)}`,
    ).join("");
    const word = capitalize(`${syllables}${rng.pick(ENDINGS)}`);
    if (word.length > maxLength || taken.has(word)) continue;
    taken.add(word);
    result.push(word);
  }
  return result;
}

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Sigla de 3 letras livre derivada de um número (A..Z em base 26). */
function abbreviationOf(index: number, used: Set<string>): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let candidate = index; candidate < index + 26 * 26 * 26; candidate++) {
    const n = candidate % (26 * 26 * 26);
    const abbreviation = `${alphabet[Math.floor(n / 676)]}${alphabet[Math.floor(n / 26) % 26]}${alphabet[n % 26]}`;
    if (!used.has(abbreviation)) {
      used.add(abbreviation);
      return abbreviation;
    }
  }
  throw new Error("siglas esgotadas");
}

/** Fases do estadual: grupos de 4 e mata-mata com mando do melhor campanha; final em ida e volta. */
function stagesOf(clubs: number): StageFormat[] {
  const groups = clubs / 4;
  // 1ª divisão (3 grupos): 2 por grupo + 2 melhores terceiros = 8; 2ª (2 grupos): 2 por grupo = 4.
  const extra = groups === 3 ? 2 : 0;
  const total = groups * 2 + extra;
  const phase = (name: string, legs: 1 | 2, prize: number): KnockoutPhase => ({
    name,
    legs,
    tiebreakers: ["extra-time", "penalties"],
    home: "overall",
    prize,
  });
  const phases: KnockoutPhase[] = [];
  if (total >= 8) phases.push(phase("Quartas de final", 1, 8_000));
  if (total >= 4) phases.push(phase("Semifinal", 1, 15_000));
  phases.push(phase("Final", 2, 30_000));
  return [
    {
      type: "groups",
      groupSize: 4,
      rounds: 1,
      points: { win: 3, draw: 1, loss: 0 },
      tiebreakers: ["wins", "goal-difference", "goals-for", "head-to-head", "draw-lots"],
      qualified: 2,
      extra,
    },
    { type: "knockout", phases, pairing: "position" },
  ];
}

/** Escolhe os primeiros `count` itens depois de embaralhar com a seed. */
function takeShuffled<T>(rng: Rng, items: readonly T[], count: number): T[] {
  return rng.shuffle([...items]).slice(0, count);
}

/** Clube regional: reputação baixa, estádio e caixa pequenos. */
function regionalClub(
  rng: Rng,
  number: number,
  city: string,
  prefixes: readonly string[],
  suffixes: readonly string[],
  countryId: string,
  region: string,
  abbreviations: Set<string>,
  idOf: (number: number) => string = (n) => `clube-r-${`${n}`.padStart(4, "0")}`,
): GeneratedClub {
  const name =
    rng.float() < 0.5 ? `${rng.pick(prefixes)} ${city}` : `${city} ${rng.pick(suffixes)}`;
  const palette = GENERATOR_TUNING.palette;
  const primary = rng.pick(palette);
  const secondary = rng.pick(palette.filter((color) => color !== primary));
  const reputation = rng.int(12, 38);
  const club: Club = {
    id: idOf(number),
    name,
    shortName: city,
    abbreviation: abbreviationOf(number * 7, abbreviations),
    city,
    countryId,
    colors: { primary, secondary },
    crest: {
      shape: rng.pick(CREST_SHAPES),
      colors: [primary, secondary],
      initials: name
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase())
        .join("")
        .slice(0, 4),
    },
    reputation,
    stadiumCapacity: Math.round(rng.int(1500, 6000) / 500) * 500,
    initialCash: Math.round((reputation * reputation * rng.int(60, 120)) / 10_000) * 10_000,
    region,
  };
  const { base, perReputation } = GENERATOR_TUNING.clubLevel;
  return { club, tier: "small", level: base + perReputation * reputation };
}

/** Reduz o elenco gerado ao tamanho regional, mantendo as melhores posições mínimas. */
function trimSquad(players: Player[]): Player[] {
  const kept = new Set<string>();
  const rest: Player[] = [];
  for (const position of POSITIONS) {
    const inPosition = players
      .filter((player) => player.position === position)
      .sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1));
    inPosition.slice(0, REGIONAL_SQUAD_MIN[position]).forEach((player) => {
      kept.add(player.id);
    });
    rest.push(...inPosition.slice(REGIONAL_SQUAD_MIN[position]));
  }
  rest
    .sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1))
    .slice(0, REGIONAL_SQUAD_EXTRA)
    .forEach((player) => {
      kept.add(player.id);
    });
  return players.filter((player) => kept.has(player.id));
}

/** Um estado do estadual: nome, clubes nacionais dele, cidades e identificação da competição. */
export interface EstadualState {
  name: string;
  /** Clubes das divisões nacionais da região (já com `region` igual ao nome). */
  nationals: Club[];
  /** Cidade do clube regional de número `clubNumber` (global, a partir de 1). */
  cityOf: (clubNumber: number) => string;
  competitionId: string;
  competitionName: string;
}

export interface EstaduaisInput {
  /** Gerador de nomes e sorteios (as forks por clube e por elenco saem dele). */
  naming: Rng;
  countryId: string;
  referenceDate: string;
  names: Pick<NameBank, "firstNames" | "surnames" | "clubPrefixes" | "clubSuffixes">;
  states: EstadualState[];
  /** Clubes da 1ª e da 2ª divisão de cada estadual (múltiplos de 4). */
  firstSize: number;
  secondSize: number;
  abbreviations: Set<string>;
  rivalSeed: string;
  /** Ids dos clubes e dos jogadores regionais (padrão `clube-r-NNNN` e `jogador-r-NNNNNN`). */
  clubId?: (number: number) => string;
  playerId?: (number: number) => string;
}

/**
 * Monta os estaduais de duas divisões (023, 024 R5): para cada estado, os clubes regionais que
 * completam as divisões com os nacionais da região, os elencos pequenos, a competição e os clássicos.
 * A ordem das forks é a de sempre: `generateRegionalBank` produz o mesmo banco de antes.
 */
export function buildEstaduais(input: EstaduaisInput): {
  competitions: Competition[];
  clubs: Club[];
  players: Player[];
  rivalries: Rivalry[];
} {
  const { naming, countryId, names, firstSize, secondSize, abbreviations } = input;
  const clubs: Club[] = [];
  const players: Player[] = [];
  const rivalries: Rivalry[] = [];
  const competitions: Competition[] = [];
  let clubNumber = 0;
  let playerNumber = 0;
  const nextPlayerId = () => {
    playerNumber += 1;
    return input.playerId
      ? input.playerId(playerNumber)
      : `jogador-r-${`${playerNumber}`.padStart(6, "0")}`;
  };
  input.states.forEach((state) => {
    const nationals = state.nationals;
    const nationalsInFirst = takeShuffled(naming.fork(`first:${state.name}`), nationals, firstSize);
    const created: GeneratedClub[] = [];
    const need = firstSize + secondSize - nationalsInFirst.length;
    for (let index = 0; index < need; index++) {
      clubNumber += 1;
      created.push(
        regionalClub(
          naming.fork(`club:${clubNumber}`),
          clubNumber,
          state.cityOf(clubNumber),
          names.clubPrefixes,
          names.clubSuffixes,
          countryId,
          state.name,
          abbreviations,
          input.clubId,
        ),
      );
    }
    for (const generated of created) {
      clubs.push(generated.club);
      const squad = generateSquad(
        naming.fork(`squad:${generated.club.id}`),
        generated,
        names as NameBank,
        input.referenceDate,
        countryId,
        nextPlayerId,
      );
      players.push(...trimSquad(squad));
    }
    const regionalIds = created.map((generated) => generated.club.id).sort();
    const firstIds = [
      ...nationalsInFirst.map((club) => club.id),
      ...regionalIds.slice(0, firstSize - nationalsInFirst.length),
    ].sort();
    const secondIds = regionalIds.slice(firstSize - nationalsInFirst.length).sort();
    const first = stagesOf(firstSize);
    const second = stagesOf(secondSize);
    competitions.push({
      id: state.competitionId,
      countryId,
      name: state.competitionName,
      format: { type: "stages", stages: first },
      regional: {
        region: state.name,
        weight: { pct: 100, byReputation: [{ from: 60, pct: 40 }] },
      },
      divisions: [
        {
          level: 1,
          name: "Primeira divisão",
          clubIds: firstIds,
          promotionSlots: 0,
          relegationSlots: 2,
          stages: first,
        },
        {
          level: 2,
          name: "Segunda divisão",
          clubIds: secondIds,
          promotionSlots: 2,
          relegationSlots: 0,
          stages: second,
        },
      ],
      schedule: { weekday: 7, startWeek: 0, everyWeeks: 1 },
    });
    // Clássicos do estado: os clubes do estadual, em grupos de 5 (013).
    const inState = [...nationals, ...created.map((generated) => generated.club)];
    rivalries.push(...generateRivalries(inState, `${input.rivalSeed}:${state.name}`));
  });
  return { competitions, clubs, players, rivalries };
}

/** Gera o banco com estaduais. Mesma seed ⇒ banco idêntico. */
export function generateRegionalBank(options: RegionalBankOptions): ValidatedBank {
  const { seed } = options;
  const stateCount = options.states ?? 27;
  const firstSize = options.firstDivisionClubs ?? 12;
  const secondSize = options.secondDivisionClubs ?? 8;
  const nationalPerDivision = options.nationalClubsPerDivision ?? 20;
  const nationalStartWeek = options.nationalStartWeek ?? 8;
  if (stateCount < 1 || stateCount > 40) throw new Error("estados deve ficar entre 1 e 40");
  if (firstSize % 4 !== 0 || secondSize % 4 !== 0) {
    throw new Error("as divisões do estadual têm clubes em múltiplos de 4 (grupos de 4)");
  }

  const names = nameBankSchema.parse(defaultNameBank);
  const base = JSON.parse(
    JSON.stringify(
      generateDefaultBank({
        seed: `${seed}:nacional`,
        divisionSize: nationalPerDivision,
        cup: false,
        manifest: options.manifest ?? {
          id: "estaduais-teste",
          name: "Mundo com estaduais",
          author: "brasfoot-like",
          version: "1.0.0",
        },
      }),
    ),
  ) as ModPackage;
  const country = base.countries[0];
  const league = base.competitions[0];
  if (!country || !league) throw new Error("banco base sem país ou liga");
  league.schedule = { ...league.schedule, startWeek: nationalStartWeek };

  const naming = createRng(`${seed}:estaduais`);
  const taken = new Set<string>(names.cities);
  const stateNames = uniqueWords(naming.fork("states"), stateCount, 14, taken);
  const regionalNeed = stateCount * (firstSize + secondSize);
  const cities = uniqueWords(naming.fork("cities"), regionalNeed, 16, taken);

  // Clubes nacionais, em ordem de id, espalhados pelos estados em rodízio.
  const nationalClubs = [...base.clubs].sort(byId);
  const nationalByState: Club[][] = Array.from({ length: stateCount }, () => []);
  const order = naming.fork("assign").shuffle(nationalClubs);
  order.forEach((club, index) => {
    const state = index % stateCount;
    club.region = stateNames[state] as string;
    (nationalByState[state] as Club[]).push(club);
  });

  const built = buildEstaduais({
    naming,
    countryId: country.id,
    referenceDate: base.manifest.referenceDate,
    names,
    states: stateNames.map((name, stateIndex) => ({
      name,
      nationals: nationalByState[stateIndex] as Club[],
      cityOf: (clubNumber) => cities[clubNumber - 1] as string,
      competitionId: `estadual-${`${stateIndex + 1}`.padStart(2, "0")}`,
      competitionName: `Campeonato de ${name}`,
    })),
    firstSize,
    secondSize,
    abbreviations: new Set(base.clubs.map((club) => club.abbreviation)),
    rivalSeed: seed,
  });
  const regionalClubs = built.clubs;
  const regionalPlayers = built.players;
  const rivalries = [...(base.rivalries ?? []), ...built.rivalries];
  const competitions = built.competitions;

  const bank: ModPackage = {
    ...base,
    competitions: [league, ...competitions],
    clubs: [...base.clubs, ...regionalClubs].sort(byId),
    players: [...base.players, ...regionalPlayers],
    rivalries: dedupeRivalries(rivalries),
  };
  const result = validateBank(bank);
  if (!result.ok || result.warnings.length > 0) {
    const issues = result.ok ? result.warnings : [...result.errors, ...result.warnings];
    throw new Error(
      `banco gerado inválido (bug do gerador): ${JSON.stringify(issues.slice(0, 5))}`,
    );
  }
  return result.bank;
}

/** Um par de clubes aparece uma vez só, com a maior intensidade. */
function dedupeRivalries(rivalries: ModPackage["rivalries"]): NonNullable<ModPackage["rivalries"]> {
  const best = new Map<string, NonNullable<ModPackage["rivalries"]>[number]>();
  for (const rivalry of rivalries ?? []) {
    const key = rivalry.clubIds.join("|");
    const current = best.get(key);
    if (!current || current.intensity < rivalry.intensity) best.set(key, rivalry);
  }
  return [...best.values()].sort((a, b) => {
    const left = a.clubIds.join("|");
    const right = b.clubIds.join("|");
    return left < right ? -1 : left > right ? 1 : 0;
  });
}
