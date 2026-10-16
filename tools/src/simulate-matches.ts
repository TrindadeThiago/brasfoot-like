// Simula muitas partidas entre clubes do banco padrão e compara as métricas com as faixas de
// realismo. Uso: pnpm sim:matches [--n 10000] [--seed calibragem]
import { parseArgs } from "node:util";
import {
  autoLineup,
  checkRealism,
  completeHiddenAttributes,
  createMetricsAccumulator,
  createRng,
  FORMATION_IDS,
  type FormationId,
  generateDefaultBank,
  type Lineup,
  type MatchInput,
  simulateMatch,
} from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";

const { values } = parseArgs({
  options: {
    n: { type: "string", default: "10000" },
    seed: { type: "string", default: "calibragem" },
  },
});

const matches = Number(values.n);
const seed = values.seed ?? "calibragem";
const world = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), "sim-matches");
const squads = new Map<string, typeof world.players>();
for (const player of world.players) {
  const squad = squads.get(player.clubId) ?? [];
  squad.push(player);
  squads.set(player.clubId, squad);
}
const lineups = new Map<string, Lineup>();
function lineupFor(clubId: string, formation: FormationId): Lineup {
  const key = `${clubId}|${formation}`;
  let lineup = lineups.get(key);
  if (!lineup) {
    const result = autoLineup({ squad: squads.get(clubId) ?? [], formation, benchLimit: 7 });
    if (!result.ok) throw new Error(`escalação impossível para ${clubId}`);
    lineup = result.lineup;
    lineups.set(key, lineup);
  }
  return lineup;
}

const divisions = world.competitions.flatMap((competition) => competition.divisions);
const rng = createRng(seed);
const metrics = createMetricsAccumulator();
const started = performance.now();
for (let index = 0; index < matches; index++) {
  const division = divisions[index % divisions.length];
  if (!division) continue;
  const [home, away] = rng.shuffle(division.clubIds) as [string, string];
  const input: MatchInput = {
    home: {
      clubId: home,
      squad: squads.get(home) ?? [],
      lineup: lineupFor(home, rng.pick(FORMATION_IDS)),
    },
    away: {
      clubId: away,
      squad: squads.get(away) ?? [],
      lineup: lineupFor(away, rng.pick(FORMATION_IDS)),
    },
    seed: `${seed}:${index}`,
  };
  const outcome = simulateMatch(input);
  if (!outcome.ok) throw new Error(JSON.stringify(outcome.errors));
  metrics.add(input, outcome.result);
}
const elapsed = (performance.now() - started) / 1000;

const summary = metrics.summary();
const checks = checkRealism(summary);
const format = (value: number) => (Number.isFinite(value) ? value.toFixed(3) : "∞");
console.log(`${summary.matches} partidas em ${elapsed.toFixed(1)} s (seed "${seed}")\n`);
for (const check of checks) {
  const limit = `${check.min ?? ""}${check.min !== undefined && check.max !== undefined ? "–" : ""}${check.max ?? ""}`;
  const bound =
    check.min !== undefined && check.max === undefined
      ? `≥ ${limit}`
      : check.max !== undefined && check.min === undefined
        ? `≤ ${limit}`
        : limit;
  console.log(
    `${check.ok ? "✓" : "✗"} ${check.metric.padEnd(24)} ${format(check.value).padStart(8)}   ${bound}`,
  );
}
console.log(
  `\n  (informativo) vitórias do mandante ${format(summary.homeWinRate)}, do visitante ${format(summary.awayWinRate)}`,
);
process.exit(checks.every((check) => check.ok) ? 0 : 1);
