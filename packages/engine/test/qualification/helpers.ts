import { nextComposition } from "../../src/career/composition";
import type { CareerSeasonState } from "../../src/career/season-state";
import { cupSeasonOf } from "../../src/knockout/history";
import type { Berth, Competition, CompletedBank, KnockoutPhase } from "../../src/model/types";
import { resolveQualification } from "../../src/qualification/resolve";
import { allSeasons, ok, playSeasons } from "../career/qualification-helpers";
import { worldBank } from "../career/world-helpers";

export interface Ids {
  league: string;
  cup: string;
  countryId: string;
  /** Clubes da divisão 1 e da divisão 2 do banco. */
  top: string[];
  second: string[];
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const FINAL: KnockoutPhase = {
  name: "Final",
  legs: 1,
  tiebreakers: ["extra-time", "penalties"],
  home: "draw",
  neutral: true,
  prize: 0,
};

/** Banco de 3 países com copa em cada um; devolve também os ids do país 0. */
export function baseWorld(): { world: CompletedBank; ids: Ids } {
  const world = worldBank({ cup: true, clubsPerDivision: 8 });
  const league = world.competitions.find(
    (competition) =>
      competition.format.type === "league" && competition.countryId === world.countries[0]?.id,
  ) as Competition;
  const cup = world.competitions.find(
    (competition) =>
      competition.format.type === "knockout" && competition.countryId === league.countryId,
  ) as Competition;
  return {
    world,
    ids: {
      league: league.id,
      cup: cup.id,
      countryId: league.countryId ?? "",
      top: [...(league.divisions[0]?.clubIds ?? [])],
      second: [...(league.divisions[1]?.clubIds ?? [])],
    },
  };
}

export function superCup(
  ids: Ids,
  berths: Berth[],
  clubIds: string[],
  id = "supercopa-teste",
): Competition {
  return {
    id,
    countryId: ids.countryId,
    name: "Supercopa de Teste",
    format: { type: "knockout", phases: [clone(FINAL)] },
    divisions: [
      { level: 1, name: "Final", clubIds, promotionSlots: 0, relegationSlots: 0, berths },
    ],
    schedule: { weekday: 6, startWeek: 0, everyWeeks: 1 },
  };
}

/** Vagas de uma supercopa entre campeão da liga e campeão da copa, com repasse para o vice da copa. */
export function superCupBerths(ids: Ids): Berth[] {
  const closing = {
    kind: "position",
    competitionId: ids.league,
    level: 1,
    from: 1,
    to: 8,
  } as const;
  return [
    {
      id: "campeao-liga",
      source: { kind: "champion", competitionId: ids.league },
      fallback: [{ kind: "runnerUp", competitionId: ids.league }, closing],
    },
    {
      id: "campeao-copa",
      source: { kind: "champion", competitionId: ids.cup },
      fallback: [{ kind: "runnerUp", competitionId: ids.league }, closing],
    },
  ];
}

/** Banco com a supercopa do país 0 (clubes da 1ª temporada: os dois primeiros da liga). */
export function superCupWorld(): { world: CompletedBank; ids: Ids } {
  const { world, ids } = baseWorld();
  const next = clone(world) as CompletedBank;
  next.competitions.push(superCup(ids, superCupBerths(ids), ids.top.slice(0, 2)));
  return { world: next, ids };
}

/** Joga uma temporada e devolve o estado final e as composições das pirâmides. */
export function playedOnce(world: CompletedBank, seed: string) {
  const { seasons } = playSeasons(world, seed, 1);
  const end = (seasons[0] as { end: CareerSeasonState }).end;
  const compositions: Record<string, Record<number, string[]>> = {};
  for (const league of allSeasons(end)) {
    if (cupSeasonOf(league)) continue;
    const competition = end.world.competitions.find((entry) => entry.id === league.competitionId);
    if (competition?.format.type !== "league" && competition?.format.type !== "stages") continue;
    compositions[league.competitionId] = nextComposition(league, end.world).composition;
  }
  return { end, compositions };
}

export function resolveOnce(world: CompletedBank, seed: string) {
  const { end, compositions } = playedOnce(world, seed);
  const outcome = resolveQualification({
    world: end.world,
    finished: allSeasons(end),
    compositions,
    number: end.league.number,
    year: end.league.year,
  });
  return { end, compositions, outcome, result: ok(outcome).result };
}
