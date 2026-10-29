import { describe, expect, it } from "vitest";
import { advanceCareerDays } from "../../../src/career/day";
import { EMPTY_HISTORY, startNextSeason } from "../../../src/career/next-season";
import type { CareerSeasonState } from "../../../src/career/season-state";
import { ensureContracts } from "../../../src/market/contracts";
import { DEFAULT_PROFILE, generateFootballWorld } from "../../../src/worldgen/football-world";
import { completeHiddenAttributes } from "../../../src/worldgen/hidden";
import { ok } from "../../career/qualification-helpers";
import { worldState } from "../../career/world-helpers";

// 024 (T042, Princípio V): temporadas sem interação no mundo compacto (6 no CI do PR; 30 com
// `FOOTBALL_WORLD_SEASONS=30`, como no job de simulação). As faixas são as da
// feature e podem ser ajustadas, com justificativa, na mesma alteração.
const SEED = "mundo-longo";
const PROFILE = DEFAULT_PROFILE;
const SEASONS = Number(process.env.FOOTBALL_WORLD_SEASONS ?? 6);

interface Stats {
  sizes: string[];
  squadProblems: string[];
  brazilSwaps: number[];
  /** Por temporada, por confederação e país: clubes na competição principal. */
  slots: Map<string, number[]>;
  cash: number[];
  crisisShare: number[];
}

const _strengthOf = new Map(
  PROFILE.confederations.flatMap((c) => c.countries.map((s) => [s.geoId, s.strength] as const)),
);

function measure(): Stats {
  const bank = generateFootballWorld(PROFILE, SEED);
  const world = ensureContracts(
    completeHiddenAttributes(bank, SEED),
    Number(bank.manifest.referenceDate.slice(0, 4)),
    SEED,
  );
  const manager =
    world.clubs.find((club) => club.countryId === "brasil" && club.reputation > 0)?.id ?? "";
  let state: CareerSeasonState = worldState(world, SEED, manager);
  let history = EMPTY_HISTORY;
  const first = new Map<string, string>();
  for (const league of [state.league, ...state.competitions]) {
    first.set(league.competitionId, league.divisions.map((d) => d.clubIds.length).join("/"));
  }
  const stats: Stats = {
    sizes: [],
    squadProblems: [],
    brazilSwaps: [],
    slots: new Map(),
    cash: [],
    crisisShare: [],
  };
  for (let season = 1; season <= SEASONS; season++) {
    for (const league of [state.league, ...state.competitions]) {
      const sizes = league.divisions.map((d) => d.clubIds.length).join("/");
      if (sizes !== first.get(league.competitionId)) {
        stats.sizes.push(`T${season} ${league.competitionId}: ${sizes}`);
      }
    }
    for (const club of state.world.clubs) {
      const squad = state.world.players.filter((player) => player.clubId === club.id);
      const keepers = squad.filter((player) => player.position === "GK").length;
      if (squad.length < 16 || squad.length > 40 || keepers < 2) {
        stats.squadProblems.push(`T${season} ${club.id}: ${squad.length}/${keepers}`);
      }
    }
    const countryOf = new Map(state.world.clubs.map((club) => [club.id, club.countryId]));
    for (const league of [state.league, ...state.competitions]) {
      if (!league.competitionId.endsWith("-maior")) continue;
      const counts = new Map<string, number>();
      for (const id of league.divisions[0]?.clubIds ?? []) {
        const country = countryOf.get(id) ?? "";
        counts.set(country, (counts.get(country) ?? 0) + 1);
      }
      const confederation = PROFILE.confederations.find(
        (c) => `continental-${c.id}-maior` === league.competitionId,
      );
      for (const spec of confederation?.countries ?? []) {
        const list = stats.slots.get(spec.geoId) ?? [];
        list.push(counts.get(spec.geoId) ?? 0);
        stats.slots.set(spec.geoId, list);
      }
    }
    const before = JSON.stringify(state.league.divisions.map((d) => [...d.clubIds].sort()));
    const end = ok(advanceCareerDays(state, { toEnd: true }, SEED, manager)).state;
    const cash = Object.values(end.finances.clubs);
    stats.cash.push(Math.round(cash.reduce((sum, club) => sum + club.cash, 0) / cash.length));
    stats.crisisShare.push(cash.filter((club) => club.inCrisis).length / cash.length);
    const next = ok(startNextSeason(end, SEED, history, manager));
    history = next.history;
    state = next.state;
    const after = JSON.stringify(state.league.divisions.map((d) => [...d.clubIds].sort()));
    stats.brazilSwaps.push(before === after ? 0 : 1);
  }
  return stats;
}

describe(`${SEASONS} temporadas no mundo ${PROFILE.id} (024 US4)`, () => {
  const stats = measure();
  if (process.env.FOOTBALL_WORLD_VERBOSE) {
    const mean = (list: number[]) => list.reduce((a, b) => a + b, 0) / list.length;
    process.stderr.write(
      `${JSON.stringify({
        cash: stats.cash,
        crisis: stats.crisisShare.map((v) => Number(v.toFixed(2))),
        slots: [...stats.slots].map(([id, list]) => [id, Number(mean(list).toFixed(2))]),
        swaps: stats.brazilSwaps.reduce((a, b) => a + b, 0),
        squad: stats.squadProblems.slice(0, 3),
      })}\n`,
    );
  }

  it("todas as divisões e competições mantêm o número de clubes em todas as temporadas", () => {
    expect(stats.sizes).toEqual([]);
  });

  it("os elencos de todos os clubes ficam válidos", () => {
    expect(stats.squadProblems).toEqual([]);
  });

  it("o acesso e o rebaixamento acontecem toda temporada", () => {
    expect(stats.brazilSwaps.reduce((a, b) => a + b, 0)).toBe(SEASONS);
  });

  it("todo país tem clube na competição continental em mais de 90% das temporadas", () => {
    for (const [country, list] of stats.slots) {
      const present = list.filter((count) => count > 0).length;
      expect(present / list.length, country).toBeGreaterThan(0.9);
    }
  });

  // Faixa medida em 30 temporadas do mundo compacto (T042): o caixa médio cai uns 0,2 milhão por
  // temporada e fecha perto de -5 milhões, com 9% dos clubes em crise; é a mesma deriva de longo
  // prazo que a linha de base da 020 já mostra (clubes em crise a partir da 17ª temporada). As faixas
  // abaixo seguram a deriva: mais que isso é regressão.
  it("a economia fica dentro da faixa: caixa médio acima de -8 milhões e no máximo 15% dos clubes em crise", () => {
    for (const cash of stats.cash) expect(cash).toBeGreaterThan(-8_000_000);
    for (const share of stats.crisisShare) expect(share).toBeLessThanOrEqual(0.15);
    // Nas primeiras 10 temporadas o mundo ainda é saudável: no máximo 8% dos clubes em crise (medido: 6% na 6ª temporada, com o caixa médio caindo uns 0,3 milhão por temporada).
    for (const share of stats.crisisShare.slice(0, 10)) expect(share).toBeLessThanOrEqual(0.08);
  });
}, 7_200_000);
