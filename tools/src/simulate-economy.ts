// Simula a economia de uma carreira sem interação e confere os limites da 008 (research.md R10).
// Uso: pnpm sim:economy [--seed <seed>] [--seasons <n>]
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  advanceCareer,
  annualWageBill,
  type CompletedBank,
  completeHiddenAttributes,
  createFinances,
  createLeagueSeason,
  type FinanceState,
  generateDefaultBank,
  type SeasonHistoryEntry,
  seasonTurnover,
  spearman,
} from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";

/** Limites de research.md R10 (os mesmos de finance/long-run.test.ts). */
export const ECONOMY_LIMITS = {
  maxAboveMedianInWageBills: 4,
  minHealthyShareEachSeason: 0.8,
  minHealthyShareAverage: 0.9,
  minSpearmanReputationCash: 0.4,
  medianCashMaxInWageBills: 5,
} as const;

export interface SimulateEconomyOptions {
  seed: string;
  seasons?: number;
  world?: CompletedBank;
}

export interface SimulateEconomyOutput {
  exitCode: number;
  lines: string[];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[middle] ?? 0)
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

const millions = (value: number) => `${(value / 1_000_000).toFixed(1)} mi`;

/** Executa a simulação e devolve a saída (testável, sem encerrar o processo). */
export function runSimulateEconomy(options: SimulateEconomyOptions): SimulateEconomyOutput {
  const seasons = options.seasons ?? 30;
  const world =
    options.world ??
    completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), options.seed);
  const competition = world.competitions[0];
  if (!competition) throw new Error("banco sem competição");
  const created = createLeagueSeason(world, {
    competitionId: competition.id,
    careerSeed: options.seed,
  });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  let league = created.league;
  let finances: FinanceState = createFinances(world, league);
  let history: SeasonHistoryEntry[] = [];
  const clubIds = Object.keys(finances.clubs).sort();
  const wages = median(
    clubIds.map((clubId) => annualWageBill(world, clubId, world.manifest.referenceDate)),
  );
  const totals = new Map(clubIds.map((clubId) => [clubId, 0]));
  const lines = [
    `Economia de ${seasons} temporadas — seed "${options.seed}"`,
    `Mediana da folha anual: ${millions(wages)}`,
    "",
  ];
  lines.push("Temp.   mínimo   mediana    máximo   crise");
  let ok = true;
  let healthySum = 0;
  let lastMedian = 0;
  for (let index = 0; index < seasons; index++) {
    const played = advanceCareer(league, finances, world, { toEnd: true }, "");
    if (!played.ok) throw new Error(JSON.stringify(played.error));
    const turned = seasonTurnover(played.league, world, history, {
      careerSeed: options.seed,
      finances: played.finances,
      managerClubId: "",
    });
    if (!turned.ok || !turned.finances) throw new Error(JSON.stringify(turned));
    league = turned.league;
    history = turned.history;
    finances = turned.finances;
    const cash = clubIds.map((clubId) => finances.clubs[clubId]?.cash ?? 0);
    for (const [position, clubId] of clubIds.entries()) {
      totals.set(clubId, (totals.get(clubId) ?? 0) + (cash[position] ?? 0));
    }
    const crisis = clubIds.filter((clubId) => finances.clubs[clubId]?.inCrisis).length;
    const healthy = 1 - crisis / clubIds.length;
    healthySum += healthy;
    lastMedian = median(cash);
    const spread = Math.max(...cash) - lastMedian;
    const seasonOk =
      spread <= ECONOMY_LIMITS.maxAboveMedianInWageBills * wages &&
      healthy >= ECONOMY_LIMITS.minHealthyShareEachSeason;
    ok &&= seasonOk;
    lines.push(
      `${seasonOk ? "✓" : "✗"} ${String(index + 1).padStart(3)} ${millions(Math.min(...cash)).padStart(9)} ${millions(lastMedian).padStart(9)} ${millions(Math.max(...cash)).padStart(9)} ${String(crisis).padStart(6)}`,
    );
  }
  const reputation = clubIds.map(
    (clubId) => world.clubs.find((club) => club.id === clubId)?.reputation ?? 0,
  );
  const correlation = spearman(
    reputation,
    clubIds.map((clubId) => (totals.get(clubId) ?? 0) / seasons),
  );
  const average = healthySum / seasons;
  const checks = [
    [
      average >= ECONOMY_LIMITS.minHealthyShareAverage,
      `clubes fora de crise na média: ${(100 * average).toFixed(1)}% (≥ ${100 * ECONOMY_LIMITS.minHealthyShareAverage}%)`,
    ],
    [
      correlation >= ECONOMY_LIMITS.minSpearmanReputationCash,
      `Spearman reputação × caixa médio: ${correlation.toFixed(3)} (≥ ${ECONOMY_LIMITS.minSpearmanReputationCash})`,
    ],
    [
      lastMedian >= 0 && lastMedian <= ECONOMY_LIMITS.medianCashMaxInWageBills * wages,
      `mediana do caixa no fim: ${millions(lastMedian)} (0 a ${millions(ECONOMY_LIMITS.medianCashMaxInWageBills * wages)})`,
    ],
  ] as const;
  lines.push("");
  for (const [passed, text] of checks) {
    ok &&= passed;
    lines.push(`${passed ? "✓" : "✗"} ${text}`);
  }
  return { exitCode: ok ? 0 : 1, lines };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const { values } = parseArgs({
    options: { seed: { type: "string", default: "economia" }, seasons: { type: "string" } },
  });
  const output = runSimulateEconomy({
    seed: values.seed ?? "economia",
    ...(values.seasons ? { seasons: Number(values.seasons) } : {}),
  });
  for (const line of output.lines) console.log(line);
  process.exit(output.exitCode);
}
