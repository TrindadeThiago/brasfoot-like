// Simula temporadas da divisão principal do banco padrão.
// Uso: pnpm sim:season [--seed <seed>] [--seasons <n>]
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  advanceSeason,
  aggregateCredibility,
  type CompletedBank,
  clubStrength,
  completeHiddenAttributes,
  createSeason,
  generateDefaultBank,
  type Season,
  seasonReport,
  seasonStats,
  standings,
  topScorers,
} from "@brasfoot-like/engine";
import { DEFAULT_SEED } from "./default-seed";

export interface SimulateSeasonOptions {
  seed: string;
  seasons?: number;
}

export interface SimulateSeasonOutput {
  exitCode: number;
  lines: string[];
}

function playSeason(seed: string): { world: CompletedBank; season: Season } {
  const world = completeHiddenAttributes(generateDefaultBank({ seed: DEFAULT_SEED }), seed);
  const competitionId = world.competitions[0]?.id ?? "";
  const created = createSeason(world, { competitionId, divisionLevel: 1, seed });
  if (!created.ok) throw new Error(JSON.stringify(created.error));
  const played = advanceSeason(created.season, world, { toEnd: true });
  if (!played.ok) throw new Error(JSON.stringify(played.error));
  return { world, season: played.season };
}

const pad = (value: string | number, width: number) => `${value}`.padStart(width);
const fixed = (value: number) => (Number.isFinite(value) ? value.toFixed(3) : "∞");

function singleSeason(seed: string): string[] {
  const { world, season } = playSeason(seed);
  const club = new Map(world.clubs.map((entry) => [entry.id, entry]));
  const player = new Map(world.players.map((entry) => [entry.id, entry]));
  const lines = [`Temporada da Série A — seed "${seed}"`, ""];
  lines.push("Pos  Clube                                 P   J   V   E   D  GP  GC   SG");
  for (const row of standings(season, world)) {
    const name = (club.get(row.clubId)?.name ?? row.clubId).padEnd(34).slice(0, 34);
    lines.push(
      `${pad(row.position, 3)}  ${name} ${pad(row.points, 3)} ${pad(row.played, 3)} ${pad(row.wins, 3)} ${pad(row.draws, 3)} ${pad(row.losses, 3)} ${pad(row.goalsFor, 3)} ${pad(row.goalsAgainst, 3)} ${pad(row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference, 4)}`,
    );
  }
  lines.push("", "Artilheiros");
  topScorers(season, 10).forEach((row, index) => {
    const name = player.get(row.playerId)?.displayName ?? row.playerId;
    const abbreviation = club.get(row.clubId)?.abbreviation ?? "";
    lines.push(
      `${pad(index + 1, 3)}. ${name} (${abbreviation}) — ${row.goals} ${row.goals === 1 ? "gol" : "gols"} em ${row.matches} jogos`,
    );
  });
  const stats = seasonStats(season);
  const sum = (pick: (row: (typeof stats)[number]) => number) =>
    stats.reduce((total, row) => total + pick(row), 0);
  lines.push(
    "",
    `Disciplina: ${sum((row) => row.yellows)} amarelos, ${sum((row) => row.reds)} vermelhos, ${sum((row) => row.matchesSuspended)} jogos de suspensão cumpridos, ${sum((row) => row.matchesInjured)} jogos perdidos por lesão`,
  );
  if (season.warnings.length > 0)
    lines.push(`Avisos: ${season.warnings.length} escalação(ões) com elenco curto`);
  const report = seasonReport(season, world);
  const champion = club.get(report.championId);
  lines.push(
    "",
    "Relatório da temporada",
    `  campeão: ${champion?.name ?? report.championId} — ${report.championPoints} pontos, ${report.championStrengthRank}º em força inicial (${clubStrength(world, report.championId).toFixed(1)})`,
    `  lanterna: ${report.lastPoints} pontos; invictos: ${report.unbeatenClubs}`,
    `  correlação força × posição (Spearman): ${report.spearman.toFixed(3)}`,
    `  gols por jogo: ${report.goalsPerMatch.toFixed(2)}; empates: ${(100 * report.drawRate).toFixed(1)}%; artilheiro: ${report.topScorerGoals} gols`,
  );
  return lines;
}

function manySeasons(seed: string, count: number): SimulateSeasonOutput {
  const reports = Array.from({ length: count }, (_, index) => {
    const { world, season } = playSeason(`${seed}-${index + 1}`);
    return seasonReport(season, world);
  });
  const checks = aggregateCredibility(reports);
  const lines = [`${count} temporadas da Série A — seed "${seed}"`, ""];
  for (const check of checks) {
    const bound =
      check.min !== undefined && check.max !== undefined
        ? `${check.min}–${check.max}`
        : check.min !== undefined
          ? `≥ ${check.min}`
          : `≤ ${check.max}`;
    lines.push(
      `${check.ok ? "✓" : "✗"} ${check.criterion.padEnd(24)} ${fixed(check.value).padStart(8)}   ${bound}`,
    );
  }
  return { exitCode: checks.every((check) => check.ok) ? 0 : 1, lines };
}

/** Executa a simulação e devolve a saída (testável, sem encerrar o processo). */
export function runSimulateSeason(options: SimulateSeasonOptions): SimulateSeasonOutput {
  if (options.seasons !== undefined && options.seasons > 1)
    return manySeasons(options.seed, options.seasons);
  return { exitCode: 0, lines: singleSeason(options.seed) };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const { values } = parseArgs({
    options: { seed: { type: "string", default: "temporada" }, seasons: { type: "string" } },
  });
  const output = runSimulateSeason({
    seed: values.seed ?? "temporada",
    ...(values.seasons ? { seasons: Number(values.seasons) } : {}),
  });
  for (const line of output.lines) console.log(line);
  process.exit(output.exitCode);
}
