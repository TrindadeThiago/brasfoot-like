import { describe, expect, it } from "vitest";
import { nextComposition } from "../../src/career/composition";
import { advanceCareerDays } from "../../src/career/day";
import { EMPTY_HISTORY, startNextSeason } from "../../src/career/next-season";
import type { CareerSeasonState } from "../../src/career/season-state";
import { isRegionalOnly } from "../../src/regional/scope";
import { ok } from "../career/qualification-helpers";
import { nationalManager, regionalSeasons, regionalWorld } from "../career/regional-helpers";
import { worldState } from "../career/world-helpers";

// 023 (T055, Princípio V): 30 temporadas sem interação num banco com estaduais. As faixas abaixo são
// as da feature e podem ser ajustadas, com justificativa, na mesma alteração. O PR roda com 4 estados;
// `REGIONAL_STATES=27` roda o banco inteiro (job de simulação).
const SEED = "estaduais-longa";
const STATES = Number(process.env.REGIONAL_STATES ?? 4);
const SEASONS = Number(process.env.REGIONAL_SEASONS ?? 30);

interface Stats {
  sizes: string[];
  squadProblems: string[];
  swaps: number[];
  champions: Map<string, Set<string>>;
  regionalCash: number[];
  inCrisis: number[];
}

function measure(): Stats {
  const world = regionalWorld({ states: STATES }, SEED);
  const manager = nationalManager(world);
  let state: CareerSeasonState = worldState(world, SEED, manager);
  let history = EMPTY_HISTORY;
  const stats: Stats = {
    sizes: [],
    squadProblems: [],
    swaps: [],
    champions: new Map(),
    regionalCash: [],
    inCrisis: [],
  };
  for (let season = 1; season <= SEASONS; season++) {
    for (const league of regionalSeasons(state)) {
      const sizes = league.divisions.map((division) => division.clubIds.length).join("/");
      if (sizes !== "12/8") stats.sizes.push(`T${season} ${league.competitionId}: ${sizes}`);
    }
    for (const club of state.world.clubs) {
      const squad = state.world.players.filter((player) => player.clubId === club.id);
      const keepers = squad.filter((player) => player.position === "GK").length;
      if (squad.length < 16 || squad.length > 40 || keepers < 2) {
        stats.squadProblems.push(
          `T${season} ${club.id}: ${squad.length} jogadores, ${keepers} goleiros`,
        );
      }
    }
    const end = ok(advanceCareerDays(state, { toEnd: true }, SEED, manager)).state;
    let swapped = 0;
    for (const league of regionalSeasons(end)) {
      const change = nextComposition(league, end.world);
      swapped += (change.promoted[2]?.length ?? 0) + (change.relegated[1]?.length ?? 0);
    }
    stats.swaps.push(swapped);
    const finances = end.finances.clubs;
    const regional = end.world.clubs.filter((club) => isRegionalOnly(end.world, club.id));
    stats.regionalCash.push(
      Math.round(
        regional.reduce((sum, club) => sum + (finances[club.id]?.cash ?? 0), 0) /
          Math.max(1, regional.length),
      ),
    );
    stats.inCrisis.push(regional.filter((club) => finances[club.id]?.inCrisis).length);
    const next = ok(startNextSeason(end, SEED, history, manager));
    history = next.history;
    state = next.state;
    for (const edition of history.regionalHistory ?? []) {
      if (edition.number !== season) continue;
      const first = edition.divisions[0];
      if (!first) continue;
      const set = stats.champions.get(edition.competitionId) ?? new Set<string>();
      set.add(first.championId);
      stats.champions.set(edition.competitionId, set);
    }
  }
  return stats;
}

describe(`30 temporadas com estaduais (${STATES} estados)`, () => {
  const stats = measure();
  if (process.env.REGIONAL_VERBOSE) {
    process.stderr.write(
      `${JSON.stringify({
        swaps: stats.swaps.slice(0, 5),
        regionalCash: stats.regionalCash.filter((_, i) => i % 5 === 0),
        inCrisis: stats.inCrisis.filter((_, i) => i % 5 === 0),
        champions: [...stats.champions].map(([id, set]) => [id, set.size]),
        squadProblems: stats.squadProblems.slice(0, 5),
      })}\n`,
    );
  }

  it("as duas divisões de cada estadual mantêm o número de clubes em todas as temporadas", () => {
    expect(stats.sizes).toEqual([]);
  });

  it("o acesso e o rebaixamento acontecem toda temporada", () => {
    expect(stats.swaps).toHaveLength(SEASONS);
    for (const swapped of stats.swaps) expect(swapped).toBe(STATES * 4);
  });

  it("os clubes regionais mantêm elencos válidos", () => {
    expect(stats.squadProblems).toEqual([]);
  });

  it("a economia dos clubes regionais fica dentro da faixa: caixa médio entre 0,5 e 30 milhões e menos de 20% em crise", () => {
    for (const cash of stats.regionalCash) {
      expect(cash).toBeGreaterThanOrEqual(500_000);
      expect(cash).toBeLessThanOrEqual(30_000_000);
    }
    for (const crisis of stats.inCrisis) expect(crisis).toBeLessThanOrEqual(STATES * 18 * 0.2);
  });

  it("os estaduais têm campeões variados em 30 anos", () => {
    for (const [, champions] of stats.champions) expect(champions.size).toBeGreaterThanOrEqual(3);
  });
}, 3_600_000);
