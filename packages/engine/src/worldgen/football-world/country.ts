import { DEFAULT_ECONOMY } from "../../finance/rules";
import { CREST_SHAPES } from "../../model/catalogs";
import type { Club, Competition, Country, Player, Rivalry } from "../../model/types";
import { bell } from "../../rng/distributions";
import { createRng, type Rng } from "../../rng/xoshiro";
import type { GeneratedClub } from "../clubs";
import { generateCup } from "../cup";
import type { NameBank } from "../name-banks/schema";
import { generateSquad } from "../players";
import { generateRivalries } from "../rivalries";
import { type Tier as ClubTier, GENERATOR_TUNING } from "../tuning";
import { scaleEconomy } from "../world-example";
import { economicScale, shiftedReputation } from "./economy";
import type { GeoCountry } from "./geo";
import { type FootballNameBank, nameBankOf } from "./names";
import { type CountrySpec, TIERS } from "./profile";

/** Adjetivos (em português) dos nomes fictícios das competições nacionais. */
export const COMPETITION_ADJECTIVES = [
  "Nacional",
  "Federal",
  "Unificado",
  "Central",
  "Integrado",
  "Profissional",
] as const;

/** Fator das faixas de reputação por divisão (0 = a mais alta). */
const DIVISION_FACTOR = [1, 0.85, 0.7, 0.58] as const;

const norm = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

/** Sigla de 3 letras livre, derivada da cidade e, se faltar, de uma contagem. */
function abbreviationFor(city: string, used: Set<string>): string {
  const letters = norm(city);
  const candidates: string[] = [letters.slice(0, 3)];
  for (let i = 1; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      candidates.push(`${letters[0]}${letters[i]}${letters[j]}`);
    }
  }
  const found = candidates.find((candidate) => candidate.length === 3 && !used.has(candidate));
  if (found) {
    used.add(found);
    return found;
  }
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const a of alphabet) {
    for (const b of alphabet) {
      for (const c of alphabet) {
        const candidate = `${a}${b}${c}`;
        if (!used.has(candidate)) {
          used.add(candidate);
          return candidate;
        }
      }
    }
  }
  throw new Error("siglas esgotadas");
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 4);
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Contexto compartilhado pelos clubes de um país. */
export interface ClubContext {
  countryId: string;
  /** Código em minúsculas, usado nos ids (`clube-<codigo>-<n>`). */
  lower: string;
  strength: number;
  bank: FootballNameBank;
  abbreviations: Set<string>;
  names: Set<string>;
  counter: { club: number; player: number };
  referenceDate: string;
}

/** Camada do clube pelas proporções da divisão (a de cima tem mais grandes). */
export function tiersOf(rng: Rng, count: number, divisionIndex: number): ClubTier[] {
  const big = divisionIndex === 0 ? Math.round(count * 0.25) : divisionIndex === 1 ? 1 : 0;
  const medium = Math.round(count * (divisionIndex <= 1 ? 0.4 : 0.3));
  const small = Math.max(0, count - big - medium);
  return rng.shuffle([
    ...Array<ClubTier>(big).fill("big"),
    ...Array<ClubTier>(medium).fill("medium"),
    ...Array<ClubTier>(small).fill("small"),
  ]);
}

/**
 * Um clube nacional fictício: nome (prefixo + cidade ou cidade + sufixo), cores e escudo gerados,
 * reputação e caixa pela força do país. A cidade é real.
 */
export function makeClub(
  rng: Rng,
  ctx: ClubContext,
  divisionIndex: number,
  tier: ClubTier,
  city: string,
  region?: string,
): GeneratedClub {
  ctx.counter.club += 1;
  const number = ctx.counter.club;
  let name = "";
  for (let attempt = 0; attempt < 12; attempt++) {
    const pick = attempt === 0 ? rng : rng.fork(`name:${attempt}`);
    name =
      pick.float() < 0.5
        ? `${pick.pick(ctx.bank.clubPrefixes)} ${city}`
        : `${city} ${pick.pick(ctx.bank.clubSuffixes)}`;
    if (!ctx.names.has(name)) break;
    if (attempt === 11) name = `${name} ${number}`.slice(0, 60);
  }
  ctx.names.add(name);
  const palette = GENERATOR_TUNING.palette;
  const primary = rng.pick(palette);
  const secondary = rng.pick(palette.filter((color) => color !== primary));
  const crestColors = [primary, secondary];
  if (rng.float() < 0.3) {
    crestColors.push(rng.pick(palette.filter((color) => color !== primary && color !== secondary)));
  }
  const key = divisionIndex === 0 ? "serieA" : "serieB";
  const [lo, hi] = GENERATOR_TUNING.reputation[key][tier];
  const factor = DIVISION_FACTOR[Math.min(divisionIndex, 3)] as number;
  const reputation = shiftedReputation(Math.round(rng.int(lo, hi) * factor), ctx.strength);
  const scale = economicScale(ctx.strength);
  const [stadiumLo, stadiumHi] = GENERATOR_TUNING.stadium[tier];
  const [cashLo, cashHi] = GENERATOR_TUNING.cashPerReputationSquared;
  const { base, perReputation, noise } = GENERATOR_TUNING.clubLevel;
  const club: Club = {
    id: `clube-${ctx.lower}-${`${number}`.padStart(3, "0")}`,
    name,
    shortName: city,
    abbreviation: abbreviationFor(city, ctx.abbreviations),
    city,
    countryId: ctx.countryId,
    colors: { primary, secondary },
    crest: { shape: rng.pick(CREST_SHAPES), colors: crestColors, initials: initialsOf(name) },
    reputation,
    stadiumCapacity: Math.max(2000, roundTo(rng.int(stadiumLo, stadiumHi) * scale, 500)),
    initialCash: roundTo(reputation * reputation * rng.int(cashLo, cashHi) * scale, 10_000),
    ...(region !== undefined ? { region } : {}),
  };
  return { club, tier, level: bell(rng, base + perReputation * reputation, noise) };
}

/** Elenco completo de um clube nacional. */
export function squadOf(
  rng: Rng,
  ctx: ClubContext,
  generated: GeneratedClub,
  names: FootballNameBank,
): Player[] {
  return generateSquad(
    rng,
    generated,
    names as unknown as NameBank,
    ctx.referenceDate,
    ctx.countryId,
    () => {
      ctx.counter.player += 1;
      return `jogador-${ctx.lower}-${`${ctx.counter.player}`.padStart(5, "0")}`;
    },
  );
}

export function countryOf(geo: GeoCountry, bank: FootballNameBank): Country {
  return {
    id: geo.id,
    name: geo.name,
    code: geo.code,
    names: { firstNames: [...bank.firstNames], surnames: [...bank.surnames] },
  };
}

/** Moldura de um país: o contexto de clubes e as competições nacionais que não dependem do formato. */
export function newContext(
  geo: GeoCountry,
  strength: number,
  language: string,
  referenceDate: string,
  abbreviations: Set<string>,
): ClubContext {
  const bank = nameBankOf(language);
  if (!bank) throw new Error(`banco de nomes inexistente: ${language}`);
  return {
    countryId: geo.id,
    lower: geo.code.toLowerCase(),
    strength,
    bank,
    abbreviations,
    names: new Set(),
    counter: { club: 0, player: 0 },
    referenceDate,
  };
}

/** Economia do país: as regras padrão em escala. */
export function countryEconomy(
  strength: number,
  divisions = 2,
  leagueClubs = 20,
): NonNullable<Competition["economy"]> {
  const base = JSON.parse(JSON.stringify(DEFAULT_ECONOMY)) as NonNullable<Competition["economy"]>;
  // Só as divisões que o país tem (a regra de economia por nível precisa existir na competição).
  base.divisions = (base.divisions ?? []).filter((division) => division.level <= divisions);
  const holder = { economy: base } as Competition;
  scaleEconomy(holder, economicScale(strength));
  // A renda de bilheteria vem dos jogos em casa: uma liga curta (menos clubes, menos rodadas) rende
  // menos por ano, então a folha de salários acompanha o número de rodadas (38 = 20 clubes).
  const rounds = 2 * (leagueClubs - 1);
  const wage = holder.economy?.wageFactorPct ?? 100;
  if (rounds < 38 && holder.economy) {
    holder.economy.wageFactorPct = Math.max(20, Math.round((wage * rounds) / 38));
  }
  return holder.economy as NonNullable<Competition["economy"]>;
}

export interface BuiltCountry {
  country: Country;
  competitions: Competition[];
  clubs: Club[];
  players: Player[];
  rivalries: Rivalry[];
}

/**
 * Um país comum do perfil (024 R1, R4): a pirâmide do nível dele (uma ou duas divisões em pontos
 * corridos), a copa nacional, os elencos e os clássicos regionais. O Brasil usa `brazil.ts`.
 */
export function buildCountry(input: {
  spec: CountrySpec;
  geo: GeoCountry;
  seed: string;
  referenceDate: string;
  abbreviations: Set<string>;
  leagueStartWeek: number;
}): BuiltCountry {
  const { spec, geo, seed } = input;
  const tier = TIERS[spec.tier];
  const divisions = spec.divisions ?? tier.divisions;
  const perDivision = spec.clubsPerDivision ?? tier.clubsPerDivision;
  const language = spec.language ?? geo.language;
  const ctx = newContext(geo, spec.strength, language, input.referenceDate, input.abbreviations);
  const root = createRng(`${seed}:${geo.id}`);
  const cities = root.fork("cities").shuffle([...geo.cities]);
  const clubs: GeneratedClub[][] = [];
  const players: Player[] = [];
  let used = 0;
  for (let d = 0; d < divisions; d++) {
    const tiers = tiersOf(root.fork(`tiers:${d}`), perDivision, d);
    const list: GeneratedClub[] = [];
    tiers.forEach((clubTier, index) => {
      const city = cities[used % cities.length] as string;
      used += 1;
      const made = makeClub(root.fork(`club:${d}:${index}`), ctx, d, clubTier, city);
      players.push(...squadOf(root.fork(`squad:${made.club.id}`), ctx, made, ctx.bank));
      list.push(made);
    });
    clubs.push(list);
  }
  const all = clubs.flat().map((made) => made.club);
  const slots = perDivision >= 20 ? 3 : 2;
  const adjective = root.fork("adjective").pick([...COMPETITION_ADJECTIVES]);
  const leagueId = `liga-${ctx.lower}`;
  const league: Competition = {
    id: leagueId,
    countryId: geo.id,
    name: `Campeonato ${adjective} de ${geo.name}`,
    format: {
      type: "league",
      rounds: 2,
      points: { win: 3, draw: 1, loss: 0 },
      tiebreakers: ["wins", "goal-difference", "goals-for", "head-to-head", "draw-lots"],
    },
    divisions: clubs.map((list, d) => ({
      level: d + 1,
      name: d === 0 ? "Primeira divisão" : "Segunda divisão",
      clubIds: list.map((made) => made.club.id).sort(),
      promotionSlots: d === 0 ? 0 : slots,
      relegationSlots: d === divisions - 1 ? 0 : slots,
    })),
    economy: countryEconomy(spec.strength, divisions, perDivision),
    schedule: { weekday: 7, startWeek: input.leagueStartWeek, everyWeeks: 1 },
  };
  const competitions: Competition[] = [league];
  if (spec.cup !== false) {
    const cup = generateCup(
      `copa-${ctx.lower}`,
      `Copa ${adjective} de ${geo.name}`,
      geo.id,
      clubs.flatMap((list, d) =>
        list.map((made) => ({ id: made.club.id, reputation: made.club.reputation, level: d + 1 })),
      ),
    );
    competitions.push(cup);
  }
  return {
    country: countryOf(geo, ctx.bank),
    competitions,
    clubs: all,
    players,
    rivalries: generateRivalries(all, `${seed}:${geo.id}`),
  };
}
