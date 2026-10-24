import type { CompletedBank } from "../../src/model/types";
import { advanceSeason, createSeason } from "../../src/season/season";
import type { MatchRecord, Season } from "../../src/season/types";
import type { StageState } from "../../src/stages/types";
import { LOWER_LEVEL, STAGES_ID } from "../fixtures/stages-bank";

function ok<T extends { ok: boolean }>(result: T): Extract<T, { ok: true }> {
  if (!result.ok) throw new Error(JSON.stringify(result));
  return result as Extract<T, { ok: true }>;
}

/** Temporada da divisão em fases do banco (cria a fase 0). */
export function stagedSeason(
  world: CompletedBank,
  seed: string | number,
  options: { competitionId?: string; divisionLevel?: number; clubIds?: readonly string[] } = {},
): Season {
  return ok(
    createSeason(world, {
      competitionId: options.competitionId ?? STAGES_ID,
      divisionLevel: options.divisionLevel ?? LOWER_LEVEL,
      seed,
      ...(options.clubIds ? { clubIds: options.clubIds } : {}),
    }),
  ).season;
}

/** Joga `rounds` rodadas (direto) pelo caminho de `advanceSeason`. */
export function playRounds(world: CompletedBank, season: Season, rounds: number): Season {
  return ok(advanceSeason(season, world, { rounds })).season;
}

/** Joga a temporada até o fim (direto). */
export function playToEnd(world: CompletedBank, season: Season): Season {
  return ok(advanceSeason(season, world, { toEnd: true })).season;
}

/** Participantes de uma fase (vazio enquanto ela não começou). */
export function stageClubs(season: Season, index: number): string[] {
  return season.stages?.[index]?.clubIds ?? [];
}

/** Rodadas já jogadas (fechadas) da temporada. */
export function roundsPlayed(season: Season): number {
  return season.nextRound - 1;
}

// ---- Temporadas sintéticas: estado montado à mão, sem passar pela criação nem pelas partidas ----

/** Gerador congruencial determinístico para resultados sintéticos. */
export function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Registro mínimo de uma partida (o suficiente para classificação e fases). */
export function record(
  round: number,
  home: string,
  away: string,
  homeGoals: number,
  awayGoals: number,
): MatchRecord {
  return {
    round,
    home,
    away,
    score: { home: homeGoals, away: awayGoals },
    outcome: "finished",
    events: [],
    stats: { home: { redCards: 0 }, away: { redCards: 0 } },
    players: {},
    unavailable: { home: [], away: [] },
  } as unknown as MatchRecord;
}

/**
 * Turno único entre os clubes do grupo: cada par joga uma vez (o de menor índice em casa). As
 * rodadas ficam em `firstRound … firstRound + n − 1`, como `generateCalendar` faria.
 */
export function roundRobin(
  group: readonly string[],
  firstRound: number,
  score: (home: string, away: string) => [number, number],
): MatchRecord[] {
  const rounds = group.length % 2 === 0 ? group.length - 1 : group.length;
  const records: MatchRecord[] = [];
  let pair = 0;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const [homeGoals, awayGoals] = score(group[i] as string, group[j] as string);
      records.push(
        record(
          firstRound + (pair++ % rounds),
          group[i] as string,
          group[j] as string,
          homeGoals,
          awayGoals,
        ),
      );
    }
  }
  return records;
}

/** `Season` montada à mão, com as fases e os registros dados. */
export function syntheticSeason(
  _world: CompletedBank,
  stages: StageState[],
  records: MatchRecord[],
  overrides: { competitionId?: string; divisionLevel?: number; seed?: string } = {},
): Season {
  const clubIds = [...new Set(stages.flatMap((stage) => stage.clubIds))].sort();
  return {
    competitionId: overrides.competitionId ?? STAGES_ID,
    divisionLevel: overrides.divisionLevel ?? LOWER_LEVEL,
    seed: overrides.seed ?? "sintetica",
    rules: { yellowsForSuspension: 3, matchesPerRed: 1 },
    clubIds,
    formations: {},
    calendar: [],
    nextRound: 1,
    records,
    status: {},
    warnings: [],
    stages,
  } as Season;
}

/** Uma fase de grupos já sorteada, com as rodadas `from … from + count − 1`. */
export function groupsState(
  index: number,
  groups: Record<string, string[]>,
  firstRound: number,
  rounds: number,
): StageState {
  const ids = Object.keys(groups).sort();
  return {
    index,
    kind: "groups",
    started: true,
    clubIds: ids.flatMap((id) => groups[id] as string[]).sort(),
    rounds: Array.from({ length: rounds }, (_, offset) => firstRound + offset),
    groups: ids.map((id) => ({ id, clubIds: groups[id] as string[] })),
  };
}

/**
 * Divisão em fases do banco regional montada à mão no ponto "grupos terminados": 4 grupos de 5 com
 * as rodadas 1–5 jogadas, a fase eliminatória (rodadas 6–8) ainda sem sorteio. O vencedor de cada
 * grupo é o clube 1, e os segundos são os clubes 2 (ordem fixa para os testes).
 */
export function afterGroupsSeason(world: CompletedBank, seed = "pos-grupos"): Season {
  const groups: Record<string, string[]> = {
    A: ["a1", "a2", "a3", "a4", "a5"],
    B: ["b1", "b2", "b3", "b4", "b5"],
    C: ["c1", "c2", "c3", "c4", "c5"],
    D: ["d1", "d2", "d3", "d4", "d5"],
  };
  const strength = (id: string) => Number(id.slice(1));
  const records = Object.values(groups).flatMap((group) =>
    roundRobin(group, 1, (home, away) => (strength(home) < strength(away) ? [2, 0] : [0, 2])),
  );
  const knockoutClubs = ["a1", "a2", "b1", "b2", "c1", "c2", "d1", "d2"];
  const phases = ["Quartas de final", "Semifinal", "Final"];
  const calendar = Array.from({ length: 8 }, (_, index) => ({ number: index + 1, fixtures: [] }));
  const season = syntheticSeason(
    world,
    [
      groupsState(0, groups, 1, 5),
      {
        index: 1,
        kind: "knockout",
        started: true,
        clubIds: [...knockoutClubs].sort(),
        rounds: [6, 7, 8],
        bracket: {
          phases: phases.map((_, index) => ({
            index,
            drawn: false,
            rounds: [6 + index],
            ties: [],
          })),
        },
      },
    ],
    records,
    { seed },
  );
  return { ...season, calendar, nextRound: 6 };
}
