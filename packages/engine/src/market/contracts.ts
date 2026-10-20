import { ageOn, seasonDate } from "../calendar/date";
import { deriveWage } from "../derived/economy";
import type { Club, CompletedBank, CompletedPlayer } from "../model/types";
import { createRng, type Rng } from "../rng/xoshiro";
import type { Contract, MarketRules } from "./types";

/** Faixas de duração ao gerar contrato por idade: [idade máxima, mínimo, máximo] (R3). */
const INITIAL_YEARS: readonly (readonly [number, number, number])[] = [
  [21, 3, 5],
  [29, 2, 4],
  [32, 1, 2],
  [99, 1, 1],
];

/** Duração permitida ao assinar, pela idade na data de referência (FR-003). */
export function contractYearsRange(age: number, rules: MarketRules): [number, number] {
  const { min, max, veteranAge, veteranMax } = rules.contractYears;
  return [min, age >= veteranAge ? Math.min(max, veteranMax) : max];
}

/** Contrato inicial: salário derivado e duração por idade, sorteada pelo PRNG recebido. */
export function initialContract(
  player: CompletedPlayer,
  club: Club,
  year: number,
  referenceDate: string,
  rng: Rng,
  yearsOverride?: number,
): Contract {
  const age = ageOn(player.birthDate, seasonDate(referenceDate, year));
  const band = INITIAL_YEARS.find(([maxAge]) => age <= maxAge) ?? INITIAL_YEARS[3];
  const years = yearsOverride ?? rng.int(band?.[1] ?? 1, band?.[2] ?? 1);
  return {
    wage: deriveWage(player, club, referenceDate),
    untilYear: year + years - 1,
  };
}

/** Preenche só os contratos que faltam (carreira nova, migração); determinístico pela seed. */
export function ensureContracts(
  world: CompletedBank,
  year: number,
  careerSeed: string,
): CompletedBank {
  if (world.players.every((player) => player.contract)) return world;
  const clubs = new Map(world.clubs.map((club) => [club.id, club]));
  const referenceDate = world.manifest.referenceDate;
  const players = world.players.map((player) => {
    if (player.contract) return player;
    const club = clubs.get(player.clubId);
    if (!club) return player;
    const rng = createRng(`${careerSeed}:contract:${year}:${player.id}`);
    return { ...player, contract: initialContract(player, club, year, referenceDate, rng) };
  });
  return { ...world, players };
}

/** Último ano de contrato (o valor de mercado cai e o aviso aparece). */
export function isLastYear(contract: Contract, year: number): boolean {
  return contract.untilYear <= year;
}
