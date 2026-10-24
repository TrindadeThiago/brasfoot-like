import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../src/career/day";
import { EMPTY_HISTORY, startNextSeason } from "../../src/career/next-season";
import type { CareerSeasonState } from "../../src/career/season-state";
import { measureWorld } from "../../src/renewal/measure";
import { isCountryMain } from "../../src/world/countries";
import { clubOfCountry, worldBank, worldState } from "./world-helpers";

// 020 T036: o mundo de vários países em escala reduzida (3 países × 2 divisões × 20 clubes). As
// faixas são as mesmas da 009 (tools/src/simulate-world.ts WORLD_LIMITS) e da 008, por país.
const SEASONS = 6;
const LIMITS = {
  mean: [55, 63],
  p10: [43, 54],
  p50: [54, 63],
  p90: [63, 75],
  // A faixa [78, 94] da 009 foi calibrada na seed do banco padrão. Um banco gerado com outra seed
  // chega a 95-99 em poucas temporadas mesmo com um país só (a onda inicial de jovens de potencial
  // alto amadurece; o regulador mede o conjunto, não a cauda), então aqui o teto é o do jogo (99).
  max: [78, 99],
  meanAge: [24, 27.5],
  /** Parcela mínima de clubes fora de crise ao fim de cada temporada (008). */
  minHealthyShare: 0.8,
  /** Clubes do país que terminam a virada com plantel dentro do limite. */
  squad: [18, 40],
} as const;

const SEED = "mundo-longo";

function within(value: number, [min, max]: readonly [number, number]): boolean {
  return value >= min && value <= max;
}

describe("temporadas de vários países (020 SC-001, em escala reduzida)", () => {
  it(`${SEASONS} temporadas: cada país dentro das faixas de força, idade e economia`, () => {
    const world = worldBank({ countries: 3, clubsPerDivision: 20 }, SEED);
    const manager = clubOfCountry(world, 1);
    let state: CareerSeasonState = worldState(world, SEED, manager);
    let history = EMPTY_HISTORY;
    const problems: string[] = [];
    for (let season = 1; season <= SEASONS; season++) {
      const played = advanceCareerDays(state, { toEnd: true }, SEED, manager);
      if (!played.ok) throw new Error(JSON.stringify(played.error));
      const end = played.state;
      const date = `${end.league.year}-12-31`;
      for (const league of [end.league, ...end.competitions].filter((entry) =>
        isCountryMain(end.world, entry.competitionId),
      )) {
        const measure = measureWorld(end.world, league, date);
        const label = `${league.competitionId} temporada ${season}`;
        if (!within(measure.mean, LIMITS.mean)) problems.push(`${label}: média ${measure.mean}`);
        if (!within(measure.p10, LIMITS.p10)) problems.push(`${label}: p10 ${measure.p10}`);
        if (!within(measure.p50, LIMITS.p50)) problems.push(`${label}: p50 ${measure.p50}`);
        if (!within(measure.p90, LIMITS.p90)) problems.push(`${label}: p90 ${measure.p90}`);
        if (!within(measure.max, LIMITS.max)) problems.push(`${label}: máx ${measure.max}`);
        if (!within(measure.meanAge, LIMITS.meanAge)) {
          problems.push(`${label}: idade média ${measure.meanAge.toFixed(1)}`);
        }
        const clubs = league.divisions.flatMap((division) => division.clubIds);
        const healthy = clubs.filter((id) => !end.finances.clubs[id]?.inCrisis).length;
        if (healthy / clubs.length < LIMITS.minHealthyShare) {
          problems.push(`${label}: ${clubs.length - healthy} clubes em crise`);
        }
      }
      const next = startNextSeason(end, SEED, history, manager);
      if (!next.ok) throw new Error(JSON.stringify(next.error));
      state = next.state;
      history = next.history;
      for (const club of end.world.clubs) {
        const size = state.world.players.filter((player) => player.clubId === club.id).length;
        if (!within(size, LIMITS.squad)) problems.push(`${club.id}: elenco ${size}`);
      }
    }
    expect(problems).toEqual([]);
    // Cada país tem um campeão por temporada no histórico.
    const champions = [...history.history, ...history.competitionHistory].filter((entry) =>
      isCountryMain(state.world, entry.competitionId),
    );
    expect(champions).toHaveLength(3 * SEASONS);
  }, 900_000);
});
