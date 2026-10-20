import { CREST_SHAPES } from "../model/catalogs";
import type { Club } from "../model/types";
import { bell } from "../rng/distributions";
import type { Rng } from "../rng/xoshiro";
import type { NameBank } from "./name-banks/schema";
import { GENERATOR_TUNING, type Range, type Tier } from "./tuning";

export type DivisionKey = "serieA" | "serieB";

export interface GeneratedClub {
  club: Club;
  tier: Tier;
  /** Nível técnico do clube, base da força dos jogadores. */
  level: number;
}

const CONNECTORS = new Set(["de", "do", "da", "dos", "das", "e"]);

function between(rng: Rng, [min, max]: Range): number {
  return rng.int(min, max);
}

function lettersOf(word: string): string {
  return word
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

function significantWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word.length > 0 && !CONNECTORS.has(word.toLowerCase()));
}

/** Sigla de 3 letras derivada da cidade, sem repetir siglas já usadas. */
function abbreviationFor(city: string, used: Set<string>): string {
  const words = significantWords(city)
    .map(lettersOf)
    .filter((word) => word.length > 0);
  const letters = words.join("");
  const candidates: string[] = [];
  const first = words[0] ?? "";
  const last = words[words.length - 1] ?? "";
  if (words.length > 1) {
    candidates.push(first.slice(0, 1) + last.slice(0, 2));
  }
  candidates.push(letters.slice(0, 3));
  for (let i = 1; i < letters.length; i++) {
    for (let j = i + 1; j < letters.length; j++) {
      candidates.push(`${letters[0]}${letters[i]}${letters[j]}`);
    }
  }
  const found = candidates.find((candidate) => candidate.length === 3 && !used.has(candidate));
  if (found === undefined) {
    throw new Error(`não foi possível gerar sigla única para ${city}`);
  }
  used.add(found);
  return found;
}

function initialsOf(name: string): string {
  return significantWords(name)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 4);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function tiersFor(rng: Rng, division: DivisionKey, perDivision: number): Tier[] {
  const counts = GENERATOR_TUNING.tierCounts[division];
  // Divisões de outro tamanho (mods gerados, 015) mantêm a proporção das camadas.
  const scale = (value: number) =>
    perDivision === GENERATOR_TUNING.clubsPerDivision
      ? value
      : Math.round((value * perDivision) / GENERATOR_TUNING.clubsPerDivision);
  const big = scale(between(rng, counts.big));
  const medium = scale(between(rng, counts.medium));
  const small = perDivision - big - medium;
  const tiers: Tier[] = [
    ...Array<Tier>(big).fill("big"),
    ...Array<Tier>(medium).fill("medium"),
    ...Array<Tier>(small).fill("small"),
  ];
  return rng.shuffle(tiers);
}

function makeClub(
  rng: Rng,
  names: NameBank,
  division: DivisionKey,
  tier: Tier,
  number: number,
  city: string,
  countryId: string,
  usedAbbreviations: Set<string>,
): GeneratedClub {
  const name =
    rng.float() < 0.5
      ? `${rng.pick(names.clubPrefixes)} ${city}`
      : `${city} ${rng.pick(names.clubSuffixes)}`;
  const palette = GENERATOR_TUNING.palette;
  const primary = rng.pick(palette);
  const secondary = rng.pick(palette.filter((color) => color !== primary));
  const crestColors = [primary, secondary];
  if (rng.float() < 0.3) {
    crestColors.push(rng.pick(palette.filter((color) => color !== primary && color !== secondary)));
  }
  const reputation = between(rng, GENERATOR_TUNING.reputation[division][tier]);
  const { base, perReputation, noise } = GENERATOR_TUNING.clubLevel;
  const level = bell(rng, base + perReputation * reputation, noise);
  const [cashMin, cashMax] = GENERATOR_TUNING.cashPerReputationSquared;

  const club: Club = {
    id: `clube-${`${number}`.padStart(3, "0")}`,
    name,
    shortName: city,
    abbreviation: abbreviationFor(city, usedAbbreviations),
    city,
    countryId,
    colors: { primary, secondary },
    crest: { shape: rng.pick(CREST_SHAPES), colors: crestColors, initials: initialsOf(name) },
    reputation,
    stadiumCapacity: roundTo(between(rng, GENERATOR_TUNING.stadium[tier]), 500),
    initialCash: roundTo(reputation * reputation * rng.int(cashMin, cashMax), 10000),
  };
  return { club, tier, level };
}

/** Gera os clubes da Série A e da Série B, cada um com sua camada e nível técnico. */
export function generateClubs(
  rng: Rng,
  names: NameBank,
  countryId: string,
  perDivision: number = GENERATOR_TUNING.clubsPerDivision,
): Record<DivisionKey, GeneratedClub[]> {
  const cities = rng
    .fork("cities")
    .shuffle(names.cities)
    .slice(0, perDivision * 2);
  if (cities.length < perDivision * 2) {
    throw new Error("cidades insuficientes no banco de nomes");
  }
  const usedAbbreviations = new Set<string>();
  const result: Record<DivisionKey, GeneratedClub[]> = { serieA: [], serieB: [] };
  (["serieA", "serieB"] as const).forEach((division, divisionIndex) => {
    const tiers = tiersFor(rng.fork(`tiers:${division}`), division, perDivision);
    tiers.forEach((tier, index) => {
      const number = divisionIndex * perDivision + index + 1;
      const city = cities[number - 1] as string;
      result[division].push(
        makeClub(
          rng.fork(`club:${division}:${index}`),
          names,
          division,
          tier,
          number,
          city,
          countryId,
          usedAbbreviations,
        ),
      );
    });
  });
  return result;
}
