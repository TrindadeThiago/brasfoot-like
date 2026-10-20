// Simula a renovação do mundo numa carreira sem interação e confere os limites da 009 (R9).
// Uso: pnpm sim:world [--seed <seed>] [--seasons <n>]
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  advanceCareer,
  ageOn,
  type CompletedBank,
  completeHiddenAttributes,
  createFinances,
  createLeagueSeason,
  type EvolutionRecord,
  emptyMarket,
  ensureContracts,
  type FinanceState,
  generateDefaultBank,
  initialRenewal,
  type LeagueSeason,
  type MarketState,
  measureWorld,
  type RenewalState,
  type SeasonHistoryEntry,
  seasonDate,
  seasonTurnover,
  squadProblems,
} from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";

/** Limites de research.md R9 (os mesmos de renewal/long-run.test.ts). */
export const WORLD_LIMITS = {
  mean: [55, 63],
  p10: [43, 54],
  p50: [54, 63],
  p90: [63, 75],
  max: [78, 94],
  minStars: 1,
  meanAge: [24, 27.5],
  minYouthMinutesGain: 1,
  /** Livres ao fim de cada virada (010, research.md R11). */
  maxFreeAgents: 150,
} as const;

export interface SimulateWorldOptions {
  seed: string;
  seasons?: number;
}

/**
 * Ganho médio por temporada dos jovens (≤ 21) no quartil de mais minutos menos o do quartil de
 * menos, numa evolução (SC-004).
 */
export function youthMinutesGap(
  world: CompletedBank,
  record: EvolutionRecord,
  date: string,
): number | undefined {
  const young = world.players
    .filter(
      (player) => ageOn(player.birthDate, date) <= 21 && record.deltas[player.id] !== undefined,
    )
    .map((player) => ({
      minutes: record.minutes[player.id] ?? 0,
      delta: record.deltas[player.id] ?? 0,
    }))
    .sort((a, b) => a.minutes - b.minutes);
  const quarter = Math.floor(young.length / 4);
  if (quarter === 0) return undefined;
  const mean = (items: typeof young) =>
    items.reduce((sum, item) => sum + item.delta, 0) / items.length;
  return mean(young.slice(-quarter)) - mean(young.slice(0, quarter));
}

export interface WorldSeason {
  measure: ReturnType<typeof measureWorld>;
  problems: string[];
  gaps: number[];
  freeAgents: number;
  /** Compras entre clubes da IA na temporada e quantas foram para clube de reputação maior. */
  transfers: number;
  upward: number;
}

/** Executa a carreira e devolve as medidas de cada temporada (testável). */
export function simulateWorld(options: SimulateWorldOptions): WorldSeason[] {
  const seasons = options.seasons ?? 30;
  const bank = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), options.seed);
  const competition = bank.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(bank, {
    competitionId: competition.id,
    careerSeed: options.seed,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let world: CompletedBank = ensureContracts(bank, created.league.year, options.seed);
  let market: MarketState = emptyMarket();
  let league: LeagueSeason = created.league;
  let finances: FinanceState = createFinances(world, league);
  let renewal: RenewalState = initialRenewal(world);
  let history: SeasonHistoryEntry[] = [];
  const result: WorldSeason[] = [];
  for (let index = 0; index < seasons; index++) {
    const gaps: number[] = [];
    const played = advanceCareer(
      league,
      finances,
      world,
      { toEnd: true },
      "",
      undefined,
      { state: renewal, careerSeed: options.seed },
      { state: market, careerSeed: options.seed },
    );
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const reputation = (clubId?: string) =>
      world.clubs.find((club) => club.id === clubId)?.reputation ?? 0;
    const purchases = (played.market?.log ?? []).filter(
      (entry) => entry.outcome === undefined && entry.kind === "sale" && entry.fromClubId,
    );
    const upward = purchases.filter(
      (entry) => reputation(entry.toClubId) > reputation(entry.fromClubId),
    ).length;
    const date = seasonDate(world.manifest.referenceDate, league.year);
    if (played.renewal?.lastEvolution) {
      const gap = youthMinutesGap(world, played.renewal.lastEvolution, date);
      if (gap !== undefined) gaps.push(gap);
    }
    const turned = seasonTurnover(played.league, played.world, history, {
      careerSeed: options.seed,
      finances: played.finances,
      managerClubId: "",
      renewal: played.renewal ?? renewal,
      market: played.market ?? market,
    });
    if (!turned.ok || !turned.finances || !turned.renewal || !turned.market) {
      throw new Error(JSON.stringify(turned));
    }
    market = turned.market;
    if (turned.renewal.lastEvolution) {
      const gap = youthMinutesGap(played.world, turned.renewal.lastEvolution, date);
      if (gap !== undefined) gaps.push(gap);
    }
    ({ league, history, world } = turned);
    finances = turned.finances;
    renewal = turned.renewal;
    result.push({
      measure: measureWorld(world, league, seasonDate(world.manifest.referenceDate, league.year)),
      problems: squadProblems(world, league),
      gaps,
      freeAgents: market.freeAgents.length,
      transfers: purchases.length,
      upward,
    });
  }
  return result;
}

const within = (value: number, [min, max]: readonly [number, number]) =>
  value >= min && value <= max;

/** Executa a simulação e devolve a saída (testável, sem encerrar o processo). */
export function runSimulateWorld(options: SimulateWorldOptions): {
  exitCode: number;
  lines: string[];
} {
  const seasons = simulateWorld(options);
  const lines = [`Mundo em ${seasons.length} temporadas — seed "${options.seed}"`, ""];
  lines.push("Temp.  média  p10  p50  p90  máx  craques  idade  elencos  livres  compras  sobem");
  let ok = true;
  for (const [index, season] of seasons.entries()) {
    const m = season.measure;
    const seasonOk =
      within(m.mean, WORLD_LIMITS.mean) &&
      within(m.p10, WORLD_LIMITS.p10) &&
      within(m.p50, WORLD_LIMITS.p50) &&
      within(m.p90, WORLD_LIMITS.p90) &&
      within(m.max, WORLD_LIMITS.max) &&
      m.stars >= WORLD_LIMITS.minStars &&
      within(m.meanAge, WORLD_LIMITS.meanAge) &&
      season.problems.length === 0 &&
      season.freeAgents <= WORLD_LIMITS.maxFreeAgents;
    ok &&= seasonOk;
    lines.push(
      `${seasonOk ? "✓" : "✗"} ${String(index + 1).padStart(3)}  ${m.mean.toFixed(1).padStart(5)} ${String(m.p10).padStart(4)} ${String(m.p50).padStart(4)} ${String(m.p90).padStart(4)} ${String(m.max).padStart(4)} ${String(m.stars).padStart(8)}  ${m.meanAge.toFixed(1).padStart(5)} ${String(season.problems.length).padStart(8)} ${String(season.freeAgents).padStart(7)} ${String(season.transfers).padStart(8)} ${(season.transfers ? (100 * season.upward) / season.transfers : 0).toFixed(0).padStart(5)}%`,
    );
  }
  const gaps = seasons.flatMap((season) => season.gaps);
  const perSeason = gaps.length ? (2 * gaps.reduce((sum, gap) => sum + gap, 0)) / gaps.length : 0;
  const gapOk = perSeason >= WORLD_LIMITS.minYouthMinutesGain;
  ok &&= gapOk;
  lines.push(
    "",
    `${gapOk ? "✓" : "✗"} jovens com mais minutos evoluem ${perSeason.toFixed(2)} pontos/temporada a mais (≥ ${WORLD_LIMITS.minYouthMinutesGain})`,
  );
  return { exitCode: ok ? 0 : 1, lines };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const { values } = parseArgs({
    options: { seed: { type: "string", default: "mundo" }, seasons: { type: "string" } },
  });
  const output = runSimulateWorld({
    seed: values.seed ?? "mundo",
    ...(values.seasons ? { seasons: Number(values.seasons) } : {}),
  });
  for (const line of output.lines) console.log(line);
  process.exit(output.exitCode);
}
