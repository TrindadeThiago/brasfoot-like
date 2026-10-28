import type { Competition, Country, ModPackage, Rivalry, ValidatedBank } from "../model/types";
import { createRng, type Rng } from "../rng/xoshiro";
import { validateBank } from "../validation/validate";
import { type ContinentalSize, continentalCompetitions } from "./continental";
import { generateCup } from "./cup";
import { generateDefaultBank } from "./generate";
import defaultNameBank from "./name-banks/default.json" with { type: "json" };
import type { NameBank } from "./name-banks/schema";

/**
 * Banco de vários países (020): cada país é um banco padrão gerado com a sua própria seed e o seu
 * banco de nomes fictício (sílabas), com ids prefixados pelo código do país e uma economia em
 * escala própria (salários, público, patrocínio, prêmios e caixa). Serve ao banco de teste de 400
 * clubes (10 países × 2 divisões × 20 clubes), aos testes de escala e ao mod de exemplo. O banco
 * padrão do jogo não usa nada disto.
 */

export interface WorldBankOptions {
  seed: string;
  /** Número de países (1 a 26). */
  countries: number;
  /** Divisões por país: 1 ou 2. */
  divisionsPerCountry: 1 | 2;
  /** Clubes por divisão (padrão 20). */
  clubsPerDivision?: number;
  /** Inclui a copa nacional de cada país. */
  cup?: boolean;
  /** Estrutura de cada país (substitui `divisionsPerCountry` e `cup`); o resto repete o último. */
  perCountry?: readonly { divisions: 1 | 2; cup?: boolean }[];
  /** Contratações internacionais da IA por clube e janela nas competições principais (padrão do jogo: 1). */
  aiInternational?: number;
  /** Escala econômica: `varied` (padrão, de 0,75 a 1,25) ou `uniform` (todos os países iguais). */
  economy?: "varied" | "uniform";
  /**
   * Vagas entre competições (021): uma supercopa por país com copa (campeões da liga e da copa) e,
   * nos países de duas divisões, uma taça alimentada pela liga (4 da divisão de baixo na 1ª fase e
   * 2 da de cima na 2ª).
   */
  qualification?: boolean;
  /**
   * Competição entre países (022): a taça continental maior, com vagas por país pelas ligas e copas
   * (`full`: 40 clubes e 10 países ou mais; `compact`: 16 clubes e 4 países ou mais).
   */
  continental?: ContinentalSize;
  /** Com `continental`, inclui a competição menor ligada à maior (padrão: sim). */
  continentalMinor?: boolean;
  /** Identificação do mod gerado. */
  manifest?: { id: string; name: string; author: string; version: string };
}

const ONSETS = ["k", "b", "l", "m", "t", "r", "v", "s", "d", "n", "p", "z", "f", "g", "h", "j"];
const VOWELS = ["a", "e", "i", "o", "u"];
const CODAS = ["", "n", "r", "l", "s", "m", "k", "d"];
const ENDINGS = ["o", "a", "e", "i", "u", "on", "an", "el", "ar", "is"];
const COUNTRY_SUFFIXES = ["ia", "ônia", "ária", "lândia", "gália"];
const COMPETITION_ADJECTIVES = ["Federal", "Unido", "Central", "Oriental", "Ocidental"];

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** Sílaba: consoante inicial do estilo do país + vogal + coda. */
function syllable(rng: Rng, onsets: readonly string[], codas: readonly string[]): string {
  return `${rng.pick(onsets)}${rng.pick(VOWELS)}${rng.pick(codas)}`;
}

/** Nomes distintos e pronunciáveis: 1 a 2 sílabas e um final; `maxLength` caracteres. */
function words(
  rng: Rng,
  count: number,
  styles: { onsets: readonly string[]; codas: readonly string[] },
  maxLength: number,
): string[] {
  const result = new Set<string>();
  let attempts = 0;
  while (result.size < count) {
    attempts += 1;
    if (attempts > count * 400) throw new Error("estilo de nomes sem variedade suficiente");
    const body = Array.from({ length: rng.int(1, 2) }, () =>
      syllable(rng, styles.onsets, styles.codas),
    ).join("");
    const word = capitalize(`${body}${rng.pick(ENDINGS)}`);
    if (word.length <= maxLength) result.add(word);
  }
  return [...result];
}

/** Código de 3 letras do país, único entre os já usados. */
function countryCode(name: string, used: Set<string>): string {
  const letters = name
    .normalize("NFD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  for (let shift = 0; shift < letters.length - 2; shift++) {
    const code = letters.slice(shift, shift + 3);
    if (code.length === 3 && !used.has(code)) return code;
  }
  for (const first of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    const code = `${first}${letters.slice(1, 3)}`;
    if (code.length === 3 && !used.has(code)) return code;
  }
  throw new Error("sem código de país disponível");
}

interface SyntheticCountry {
  names: NameBank;
  code: string;
}

/** Banco de nomes fictício do país `index`, com estilo (consoantes) próprio. */
function syntheticNames(seed: string, index: number, used: Set<string>): SyntheticCountry {
  const rng = createRng(`${seed}:names:${index}`);
  const onsets = rng.shuffle(ONSETS).slice(0, 9);
  const codas = rng.shuffle(CODAS).slice(0, 5);
  const style = { onsets, codas };
  const [stem = "Kar"] = words(rng.fork("country"), 1, style, 9);
  const countryName = `${stem.slice(0, 5)}${rng.pick(COUNTRY_SUFFIXES)}`;
  const code = countryCode(countryName, used);
  used.add(code);
  const adjective = rng.pick(COMPETITION_ADJECTIVES);
  const cities = words(rng.fork("cities"), 70, style, 16);
  const names: NameBank = {
    countryName,
    countryCode: code,
    competitionName: `Campeonato ${adjective} de ${countryName}`,
    cupName: `Copa de ${countryName}`,
    firstNames: words(rng.fork("first"), 220, style, 14),
    surnames: words(rng.fork("surnames"), 220, style, 16),
    cities,
    clubPrefixes: [...defaultNameBank.clubPrefixes],
    clubSuffixes: [...defaultNameBank.clubSuffixes],
  };
  return { names, code };
}

/** Escala econômica do país `index` entre 0,75 e 1,25 (ordem embaralhada pela seed). */
function economicScales(seed: string, count: number): number[] {
  const order = createRng(`${seed}:scales`).shuffle(Array.from({ length: count }, (_, i) => i));
  return order.map((position) => (count === 1 ? 1 : 0.75 + (0.5 * position) / (count - 1)));
}

function scaled(value: number, factor: number): number {
  return Math.max(1, Math.round(value * factor));
}

/**
 * Aplica a escala às regras econômicas da competição (R10): salários, público, estádios,
 * patrocínio, prêmios e crédito andam juntos, para que o país fique tão equilibrado quanto o
 * mundo padrão (008). O preço do ingresso não muda.
 */
export function scaleEconomy(competition: Competition, factor: number): void {
  const economy = competition.economy;
  if (!economy) return;
  economy.wageFactorPct = scaled(economy.wageFactorPct ?? 100, factor);
  economy.fansBase = scaled(economy.fansBase ?? 16_000, factor);
  if (economy.fansPerReputation !== undefined) {
    economy.fansPerReputation = scaled(economy.fansPerReputation, factor);
  }
  if (economy.credit) economy.credit.perReputation = scaled(economy.credit.perReputation, factor);
  if (economy.stadium) {
    economy.stadium.maxCapacity = Math.max(1000, scaled(economy.stadium.maxCapacity, factor));
    for (const option of economy.stadium.options) {
      option.cost = scaled(option.cost, factor);
      option.seats = Math.max(100, Math.round(scaled(option.seats, factor) / 100) * 100);
    }
  }
  for (const division of economy.divisions ?? []) {
    if (division.sponsorship) {
      division.sponsorship.base = scaled(division.sponsorship.base ?? 0, factor);
      division.sponsorship.perReputation = scaled(division.sponsorship.perReputation ?? 0, factor);
    }
    if (division.prizes) {
      const prizes = division.prizes;
      prizes.first = scaled(prizes.first ?? 0, factor);
      prizes.last = scaled(prizes.last ?? 0, factor);
      prizes.title = scaled(prizes.title ?? 0, factor);
    }
    if (division.creditBase !== undefined) {
      division.creditBase = scaled(division.creditBase, factor);
    }
  }
}

/** Troca a letra seguinte da sigla até achar uma livre. */
function uniqueAbbreviation(abbreviation: string, used: Set<string>): string {
  if (!used.has(abbreviation)) return abbreviation;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const second of alphabet) {
    for (const third of alphabet) {
      const candidate = `${abbreviation.charAt(0)}${second}${third}`;
      if (!used.has(candidate)) return candidate;
    }
  }
  throw new Error("siglas esgotadas");
}

/**
 * Taça dos classificados do país (021 R5): mata-mata de 6 clubes alimentado pela liga nacional. Os
 * 4 primeiros da divisão de baixo abrem a taça; os 2 primeiros da divisão de cima entram na 2ª fase.
 * É o exemplo de acesso entre competições com entrada tardia, só com clubes da pirâmide.
 */
function qualifiersCupOf(
  competitions: readonly Competition[],
  countryName: string,
  lower: string,
): Competition | undefined {
  const league = competitions.find((competition) => competition.format.type === "league");
  const top = league?.divisions[0];
  const bottom = league?.divisions[1];
  if (!league || !top || !bottom || bottom.clubIds.length < 4 || top.clubIds.length < 2) {
    return undefined;
  }
  const closing = (level: number, size: number) =>
    ({ kind: "position", competitionId: league.id, level, from: 1, to: size }) as const;
  const phase = (name: string, prize: number) => ({
    name,
    legs: 1 as const,
    tiebreakers: ["extra-time", "penalties"] as ("extra-time" | "penalties")[],
    home: "ranking" as const,
    prize,
  });
  const opening = [...bottom.clubIds].sort().slice(0, 4);
  const entering = [...top.clubIds].sort().slice(0, 2);
  return {
    id: `taca-${lower}`,
    countryId: league.countryId,
    name: `Taça dos Classificados de ${countryName}`,
    format: {
      type: "knockout",
      phases: [phase("Primeira fase", 20_000), phase("Semifinais", 40_000), phase("Final", 80_000)],
      entries: [{ phase: 1, clubIds: entering }],
    },
    divisions: [
      {
        level: 1,
        name: "Taça",
        clubIds: [...opening, ...entering].sort(),
        promotionSlots: 0,
        relegationSlots: 0,
        berths: [
          {
            id: "base-da-liga",
            source: {
              kind: "position",
              competitionId: league.id,
              level: bottom.level,
              from: 1,
              to: 4,
            },
            fallback: [closing(bottom.level, bottom.clubIds.length)],
          },
          {
            id: "elite-da-liga",
            source: {
              kind: "position",
              competitionId: league.id,
              level: top.level,
              from: 1,
              to: 2,
            },
            entry: { phase: 2 },
            fallback: [closing(top.level, top.clubIds.length)],
          },
        ],
      },
    ],
    schedule: { weekday: 4, startWeek: 2, everyWeeks: 2 },
  };
}

/**
 * Supercopa do país (021 R4): final única entre o campeão da liga e o da copa. Se o mesmo clube ganha
 * as duas, o vice da liga ocupa a vaga; o fechamento é a tabela inteira da divisão de cima. Os
 * participantes da 1ª temporada são os dois primeiros clubes da divisão de cima, por id.
 */
export function supercupOf(
  competitions: readonly Competition[],
  countryName: string,
  lower: string,
): Competition | undefined {
  const league = competitions.find((competition) => competition.format.type === "league");
  const cup = competitions.find((competition) => competition.format.type === "knockout");
  const top = league?.divisions[0];
  if (!league || !cup || !top) return undefined;
  const closing = {
    kind: "position",
    competitionId: league.id,
    level: 1,
    from: 1,
    to: top.clubIds.length,
  } as const;
  return {
    id: `supercopa-${lower}`,
    countryId: league.countryId,
    name: `Supercopa de ${countryName}`,
    format: {
      type: "knockout",
      phases: [
        {
          name: "Final",
          legs: 1,
          tiebreakers: ["extra-time", "penalties"],
          home: "draw",
          neutral: true,
          prize: 0,
        },
      ],
    },
    divisions: [
      {
        level: 1,
        name: "Final",
        clubIds: [...top.clubIds].sort().slice(0, 2),
        promotionSlots: 0,
        relegationSlots: 0,
        berths: [
          {
            id: "campeao-liga",
            source: { kind: "champion", competitionId: league.id },
            fallback: [{ kind: "runnerUp", competitionId: league.id }, closing],
          },
          {
            id: "campeao-copa",
            source: { kind: "champion", competitionId: cup.id },
            fallback: [{ kind: "runnerUp", competitionId: league.id }, closing],
          },
        ],
      },
    ],
    schedule: { weekday: 6, startWeek: 0, everyWeeks: 1 },
  };
}

/** Gera o banco de vários países (020). Mesma seed ⇒ banco idêntico. */
export function generateWorldBank(options: WorldBankOptions): ValidatedBank {
  const { seed, countries: count, divisionsPerCountry } = options;
  if (count < 1 || count > 26) throw new Error("países deve ficar entre 1 e 26");
  const clubsPerDivision = options.clubsPerDivision ?? 20;
  const usedCodes = new Set<string>();
  const usedAbbreviations = new Set<string>();
  const scales =
    options.economy === "uniform"
      ? Array.from({ length: count }, () => 1)
      : economicScales(seed, count);

  const countries: Country[] = [];
  const competitions: Competition[] = [];
  const clubs: ModPackage["clubs"] = [];
  const players: ModPackage["players"] = [];
  const rivalries: Rivalry[] = [];
  let referenceDate = "";

  for (let index = 0; index < count; index++) {
    const { names, code } = syntheticNames(seed, index, usedCodes);
    const lower = code.toLowerCase();
    const factor = scales[index] as number;
    const spec = options.perCountry?.[Math.min(index, (options.perCountry?.length ?? 1) - 1)];
    const divisions = spec?.divisions ?? divisionsPerCountry;
    const withCup = spec ? spec.cup === true : options.cup === true;
    const base = generateDefaultBank({
      seed: `${seed}:${code}`,
      names,
      divisionSize: clubsPerDivision,
      cup: withCup && divisions === 2,
    });
    referenceDate = base.manifest.referenceDate;
    const bank = JSON.parse(JSON.stringify(base)) as ModPackage;

    const clubId = (id: string) => id.replace("clube-", `clube-${lower}-`);
    const playerId = (id: string) => id.replace("jogador-", `jogador-${lower}-`);
    const main = bank.competitions[0] as Competition;
    if (divisions === 1) {
      const dropped = new Set(main.divisions[1]?.clubIds ?? []);
      main.divisions = main.divisions.slice(0, 1);
      const top = main.divisions[0];
      if (top) top.relegationSlots = 0;
      if (main.economy?.divisions) {
        main.economy.divisions = main.economy.divisions.filter((division) => division.level === 1);
      }
      bank.clubs = bank.clubs.filter((club) => !dropped.has(club.id));
      bank.players = bank.players.filter((player) => !dropped.has(player.clubId));
      if (withCup) {
        bank.competitions.push(
          generateCup(
            "copa-nacional",
            names.cupName ?? "Copa Nacional",
            bank.countries[0]?.id ?? lower,
            bank.clubs.map((club) => ({ ...club, level: 1 })),
          ),
        );
      }
    }
    const kept = new Set(bank.clubs.map((club) => club.id));

    for (const competition of bank.competitions) {
      competition.id = competition.id.replace(/^(liga|copa)-/, `$1-${lower}-`);
      for (const division of competition.divisions) {
        division.clubIds = division.clubIds.filter((id) => kept.has(id)).map(clubId);
      }
      if (competition.format.type === "knockout") {
        for (const entry of competition.format.entries ?? []) {
          entry.clubIds = entry.clubIds.filter((id) => kept.has(id)).map(clubId);
        }
      }
    }
    if (options.qualification === true) {
      const supercup = supercupOf(bank.competitions, names.countryName ?? code, lower);
      if (supercup) bank.competitions.push(supercup);
      const qualifiers = qualifiersCupOf(bank.competitions, names.countryName ?? code, lower);
      if (qualifiers) bank.competitions.push(qualifiers);
    }
    scaleEconomy(main, factor);
    if (options.aiInternational !== undefined) {
      main.market = {
        ...main.market,
        aiMarket: { ...main.market?.aiMarket, maxInternationalPerClub: options.aiInternational },
      };
    }

    for (const club of bank.clubs) {
      club.id = clubId(club.id);
      club.abbreviation = uniqueAbbreviation(club.abbreviation, usedAbbreviations);
      usedAbbreviations.add(club.abbreviation);
      club.initialCash = Math.round(scaled(club.initialCash, factor) / 10_000) * 10_000;
      club.stadiumCapacity = Math.max(
        2000,
        Math.round(scaled(club.stadiumCapacity, factor) / 500) * 500,
      );
    }
    for (const player of bank.players) {
      player.id = playerId(player.id);
      if (player.clubId !== undefined) player.clubId = clubId(player.clubId);
    }
    for (const rivalry of bank.rivalries ?? []) {
      const keptPair = rivalry.clubIds.every((id) => kept.has(id));
      if (!keptPair) continue;
      rivalries.push({
        ...rivalry,
        clubIds: rivalry.clubIds.map(clubId) as [string, string],
      });
    }

    countries.push(...bank.countries);
    competitions.push(...bank.competitions);
    clubs.push(...bank.clubs);
    players.push(...bank.players);
  }

  if (options.continental) {
    competitions.push(
      ...continentalCompetitions(
        { size: options.continental, countries, competitions, clubs, scales },
        { minor: options.continentalMinor !== false },
      ),
    );
    // A torcida pesa mais a taça e espera mais de quem a disputa (022 R7).
    const seen = new Set<string>();
    for (const competition of competitions) {
      if (competition.countryId === undefined || seen.has(competition.countryId)) continue;
      seen.add(competition.countryId);
      competition.fans = {
        ...competition.fans,
        continentalMatchPct: 150,
        continentalExpectation: 2,
        continentalTitle: 20,
      };
    }
  }

  const bank: ModPackage = {
    manifest: {
      formatVersion: 1,
      ...(options.manifest ?? {
        id: "mundo-teste",
        name: "Mundo de vários países",
        author: "brasfoot-like",
        version: "1.0.0",
      }),
      referenceDate,
    },
    countries,
    competitions,
    clubs,
    players,
    rivalries,
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
