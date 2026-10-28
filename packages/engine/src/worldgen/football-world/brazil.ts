import type { Club, Competition, KnockoutPhase, Player, StageFormat } from "../../model/types";
import { createRng } from "../../rng/xoshiro";
import type { GeneratedClub } from "../clubs";
import { apportion } from "../continental";
import { generateCup } from "../cup";
import type { NameBank } from "../name-banks/schema";
import { buildEstaduais } from "../regional";
import { supercupOf } from "../world-example";
import {
  type BuiltCountry,
  countryEconomy,
  countryOf,
  makeClub,
  newContext,
  squadOf,
  tiersOf,
} from "./country";
import { BRAZIL_STATES, type GeoCountry, type GeoState } from "./geo";
import type { BrazilSpec, CountrySpec } from "./profile";

/** Peso de cada estado na distribuição dos clubes nacionais (os maiores têm mais clubes). */
const STATE_WEIGHTS: Record<string, number> = {
  SP: 10,
  RJ: 8,
  MG: 8,
  RS: 6,
  PR: 5,
  BA: 4,
  SC: 4,
  PE: 3,
  CE: 3,
  GO: 3,
  ES: 2,
  PA: 2,
  DF: 2,
  AM: 1,
  MA: 1,
  MT: 1,
  MS: 1,
  PB: 1,
  RN: 1,
  AL: 1,
  PI: 1,
  SE: 1,
  TO: 1,
  RO: 1,
  AC: 1,
  AP: 1,
  RR: 1,
};

/** Os `count` estados de maior peso (desempate pela sigla), em ordem de peso. */
export function brazilStates(count: number): GeoState[] {
  return [...BRAZIL_STATES]
    .sort(
      (a, b) =>
        (STATE_WEIGHTS[b.abbreviation] ?? 1) - (STATE_WEIGHTS[a.abbreviation] ?? 1) ||
        (a.abbreviation < b.abbreviation ? -1 : 1),
    )
    .slice(0, count);
}

const SERIES = ["Série A", "Série B", "Série C", "Série D"];

const POINTS = { win: 3, draw: 1, loss: 0 };
const TIEBREAKERS = ["wins", "goal-difference", "goals-for", "head-to-head", "draw-lots"] as const;

/** A divisão D: grupos de clubes da mesma região e mata-mata de 8 (final em ida e volta). */
function divisionDStages(perDivision: number): StageFormat[] {
  const phase = (name: string, legs: 1 | 2, prize: number): KnockoutPhase => ({
    name,
    legs,
    tiebreakers: ["extra-time", "penalties"],
    home: "overall",
    prize,
  });
  return [
    {
      type: "groups",
      groupSize: perDivision / 4,
      rounds: 1,
      points: POINTS,
      tiebreakers: [...TIEBREAKERS],
      qualified: 2,
      extra: 0,
      draw: { rules: [{ kind: "concentrate", attribute: "region" }] },
    },
    {
      type: "knockout",
      phases: [
        phase("Quartas de final", 1, 6_000),
        phase("Semifinal", 1, 10_000),
        phase("Final", 2, 20_000),
      ],
      pairing: "position",
    },
  ];
}

/** Usa cada cidade do estado no máximo duas vezes, em ordem embaralhada. */
function cityQueue(cities: readonly string[], seed: string): () => string {
  const order = createRng(seed).shuffle([...cities]);
  let used = 0;
  return () => {
    const city = order[Math.floor(used / 2) % order.length] as string;
    used += 1;
    return city;
  };
}

/**
 * O Brasil do mundo completo (024 R5): divisões A, B e C de pontos corridos, D em grupos regionais e
 * mata-mata, copa nacional, supercopa e os estaduais dos estados do perfil. Os clubes nacionais
 * moram nos estados (pesos), e as cidades são as reais de cada estado.
 */
export function buildBrazil(input: {
  spec: CountrySpec;
  brazil: BrazilSpec;
  geo: GeoCountry;
  seed: string;
  referenceDate: string;
  abbreviations: Set<string>;
  leagueStartWeek: number;
}): BuiltCountry {
  const { spec, brazil, geo, seed } = input;
  const perDivision = brazil.clubsPerDivision;
  const states = brazilStates(brazil.states);
  const ctx = newContext(
    geo,
    spec.strength,
    spec.language ?? geo.language,
    input.referenceDate,
    input.abbreviations,
  );
  const root = createRng(`${seed}:${geo.id}`);

  // Quantos clubes nacionais cada estado tem (até a 1ª divisão do estadual).
  const total = perDivision * 4;
  const caps = states.map(() => brazil.estadual.firstDivision);
  const counts = apportion(
    total,
    states.map((state) => STATE_WEIGHTS[state.abbreviation] ?? 1),
    caps,
  );
  const homes = root
    .fork("homes")
    .shuffle(
      states.flatMap((state, index) => Array<string>(counts[index] as number).fill(state.id)),
    );
  const queues = new Map(
    states.map((state) => [state.id, cityQueue(state.cities, `${seed}:cities:${state.id}`)]),
  );
  const stateById = new Map(states.map((state) => [state.id, state]));

  const divisions: GeneratedClub[][] = [];
  const players: Player[] = [];
  for (let d = 0; d < 4; d++) {
    const tiers = tiersOf(root.fork(`tiers:${d}`), perDivision, d);
    const list: GeneratedClub[] = [];
    tiers.forEach((tier, index) => {
      const state = stateById.get(homes[d * perDivision + index] as string) as GeoState;
      const city = (queues.get(state.id) as () => string)();
      const made = makeClub(root.fork(`club:${d}:${index}`), ctx, d, tier, city, state.name);
      players.push(...squadOf(root.fork(`squad:${made.club.id}`), ctx, made, ctx.bank));
      list.push(made);
    });
    divisions.push(list);
  }
  const nationals = divisions.flat().map((made) => made.club);

  const slots = perDivision >= 20 ? 4 : 3;
  const league: Competition = {
    id: "liga-bra",
    countryId: geo.id,
    name: "Campeonato Nacional do Brasil",
    format: {
      type: "league",
      rounds: 2,
      points: POINTS,
      tiebreakers: [...TIEBREAKERS],
    },
    divisions: divisions.map((list, d) => ({
      level: d + 1,
      name: SERIES[d] as string,
      clubIds: list.map((made) => made.club.id).sort(),
      promotionSlots: d === 0 ? 0 : slots,
      relegationSlots: d === 3 ? 0 : slots,
      ...(d === 3 ? { stages: divisionDStages(perDivision) } : {}),
    })),
    economy: countryEconomy(spec.strength, 2, perDivision),
    schedule: { weekday: 7, startWeek: input.leagueStartWeek, everyWeeks: 1 },
  };
  // Uma divisão aceita no máximo 40 clubes: a copa leva a Série A, depois a B e a C, por reputação.
  const cupClubs = divisions
    .slice(0, 3)
    .flatMap((list, d) =>
      [...list]
        .sort((a, b) => b.club.reputation - a.club.reputation || (a.club.id < b.club.id ? -1 : 1))
        .map((made) => ({ id: made.club.id, reputation: made.club.reputation, level: d + 1 })),
    )
    .slice(0, 40);
  const cup = generateCup("copa-bra", "Copa Nacional do Brasil", geo.id, cupClubs);
  const competitions: Competition[] = [league, cup];
  const supercup = supercupOf(competitions, geo.name, ctx.lower);
  if (supercup) competitions.push(supercup);

  // Estaduais: nacionais por estado e clubes regionais com as cidades reais do estado.
  const nationalsByState = new Map<string, Club[]>(states.map((state) => [state.id, []]));
  for (const club of nationals) {
    const state = states.find((entry) => entry.name === club.region);
    if (state) (nationalsByState.get(state.id) as Club[]).push(club);
  }
  const regionalCity = new Map(
    states.map((state) => [
      state.id,
      cityQueue(state.cities, `${seed}:regional-cities:${state.id}`),
    ]),
  );
  const built = buildEstaduais({
    naming: root.fork("estaduais"),
    countryId: geo.id,
    referenceDate: input.referenceDate,
    names: ctx.bank as unknown as Pick<
      NameBank,
      "firstNames" | "surnames" | "clubPrefixes" | "clubSuffixes"
    >,
    states: states.map((state) => ({
      name: state.name,
      nationals: nationalsByState.get(state.id) as Club[],
      cityOf: () => (regionalCity.get(state.id) as () => string)(),
      competitionId: `estadual-${state.abbreviation.toLowerCase()}`,
      competitionName: `Campeonato Estadual de ${state.name}`,
    })),
    firstSize: brazil.estadual.firstDivision,
    secondSize: brazil.estadual.secondDivision,
    abbreviations: input.abbreviations,
    rivalSeed: `${seed}:${geo.id}`,
    clubId: (n) => `clube-${ctx.lower}-r-${`${n}`.padStart(4, "0")}`,
    playerId: (n) => `jogador-${ctx.lower}-r-${`${n}`.padStart(6, "0")}`,
  });
  return {
    country: countryOf(geo, ctx.bank),
    competitions: [...competitions, ...built.competitions],
    clubs: [...nationals, ...built.clubs],
    players: [...players, ...built.players],
    rivalries: built.rivalries,
  };
}
