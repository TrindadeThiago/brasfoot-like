import {
  advanceSeason,
  type CompletedBank,
  clubUnavailability,
  createSeason,
  FORMATION_IDS,
  isSeasonOver,
  type LeagueSeason,
  leagueSeasonSeed,
  POSTURES,
  type Season,
  validateBank,
  validateLineup,
} from "@brasfoot-like/engine";
import { z } from "zod";
import { MANAGER_NAME_MAX, SAVE_FORMAT_VERSION, type SaveFile } from "./format";
import { initialLineup } from "./lineup";

/** Transforma um save da versão `from` na versão `from + 1`. */
export interface Migration {
  from: number;
  migrate(raw: unknown): unknown;
}

/** v1 → v2: a carreira ganha a escalação do jogador (automática no esquema do clube). */
const addLineup: Migration = {
  from: 1,
  migrate(raw) {
    const save = raw as { bank: CompletedBank; season: Season; clubId: string };
    return {
      ...(raw as object),
      formatVersion: 2,
      lineup: initialLineup(save.bank, save.season, save.clubId),
    };
  },
};

/**
 * v2 → v3: a temporada da Série A vira a temporada da liga (007 R9). As outras divisões são
 * criadas com a mesma seed e avançadas até a mesma rodada; o histórico começa vazio.
 */
const addLeague: Migration = {
  from: 2,
  migrate(raw) {
    const { season, ...rest } = raw as { bank: CompletedBank; season: Season; seed: string };
    const competition = rest.bank.competitions.find((entry) => entry.id === season.competitionId);
    if (!competition) throw new Error(`competição ${season.competitionId} não existe no banco`);
    const divisions: Season[] = [season];
    for (const division of competition.divisions) {
      if (division.level === season.divisionLevel) continue;
      const created = createSeason(rest.bank, {
        competitionId: competition.id,
        divisionLevel: division.level,
        seed: season.seed,
        rules: season.rules,
      });
      if (!created.ok) throw new Error(created.error.code);
      const played = season.nextRound - 1;
      const advanced =
        played > 0 ? advanceSeason(created.season, rest.bank, { rounds: played }) : created;
      if (!advanced.ok) throw new Error(advanced.error.code);
      divisions.push(advanced.season);
    }
    divisions.sort((a, b) => a.divisionLevel - b.divisionLevel);
    const league: LeagueSeason = {
      competitionId: competition.id,
      number: 1,
      year: Number(rest.bank.manifest.referenceDate.slice(0, 4)),
      seed: String(season.seed),
      divisions,
    };
    return { ...rest, formatVersion: 3, league, history: [] };
  },
};

/** Migrações reais do formato, em ordem. */
export const MIGRATIONS: readonly Migration[] = [addLineup, addLeague];

/** Problemas que tornam a escalação gravada ilegível (os demais o jogo corrige ou avisa). */
const BROKEN_LINEUP = new Set([
  "unknown_formation",
  "unknown_slot",
  "duplicate_player",
  "not_in_squad",
  "bench_too_large",
]);

export type LoadResult =
  | { status: "ok"; save: SaveFile; migratedFrom?: number }
  | { status: "future_version"; version: number }
  | { status: "corrupt"; reason: string };

const envelopeSchema = z.object({
  formatVersion: z.int(),
  id: z.string().min(1),
  createdAt: z.string().min(1),
  savedAt: z.string().min(1),
  managerName: z.string().min(1).max(MANAGER_NAME_MAX),
  clubId: z.string().min(1),
  seed: z.string().min(1),
  bank: z.unknown(),
  league: z.object({
    competitionId: z.string().min(1),
    number: z.int().min(1),
    year: z.int(),
    seed: z.string().min(1),
    divisions: z
      .array(
        z.object({
          divisionLevel: z.int().min(1),
          seed: z.union([z.string(), z.number()]),
          clubIds: z.array(z.string()),
          calendar: z.array(z.unknown()),
          nextRound: z.int().min(1),
          records: z.array(z.unknown()),
          status: z.record(z.string(), z.unknown()),
        }),
      )
      .min(1),
  }),
  history: z.array(z.object({ number: z.int(), year: z.int() }).loose()),
  lineup: z.object({
    formation: z.enum(FORMATION_IDS),
    posture: z.enum(POSTURES),
    starters: z.record(z.string(), z.string()),
    bench: z.array(z.string()),
  }),
  lineupNotice: z.array(z.object({ kind: z.string() }).loose()).optional(),
});

/** Motivo pelo qual a liga não combina com a carreira, ou nada se combina. */
function leagueProblem(save: SaveFile): string | undefined {
  const { league } = save;
  if (league.seed !== leagueSeasonSeed(save.seed, league.number)) {
    return "seed da temporada incoerente com a carreira";
  }
  if (league.divisions.some((season) => String(season.seed) !== league.seed)) {
    return "divisão com seed de outra temporada";
  }
  const homes = league.divisions.filter((season) => season.clubIds.includes(save.clubId));
  if (homes.length !== 1) return "clube do jogador fora de uma única divisão";
  const rounds = new Set(
    league.divisions.filter((season) => !isSeasonOver(season)).map((season) => season.nextRound),
  );
  if (rounds.size > 1) return "divisões em rodadas diferentes";
  return undefined;
}

function versionOf(raw: unknown): number | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const value = (raw as { formatVersion?: unknown }).formatVersion;
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}

/**
 * Abre um save de qualquer versão (FR-009, FR-010): aplica as migrações em cadeia até a versão
 * atual e valida o resultado. Versão futura não é alterada.
 */
export function migrateSave(
  raw: unknown,
  migrations: readonly Migration[] = MIGRATIONS,
  target: number = SAVE_FORMAT_VERSION,
): LoadResult {
  const original = versionOf(raw);
  if (original === undefined) return { status: "corrupt", reason: "sem versão" };
  if (original > target) return { status: "future_version", version: original };

  let current: unknown = raw;
  let version = original;
  while (version < target) {
    const step = migrations.find((migration) => migration.from === version);
    if (!step) return { status: "corrupt", reason: `sem migração a partir da versão ${version}` };
    try {
      current = step.migrate(current);
    } catch (error) {
      return { status: "corrupt", reason: `migração ${version} falhou: ${String(error)}` };
    }
    const next = versionOf(current);
    if (next !== version + 1)
      return { status: "corrupt", reason: `migração ${version} não avançou a versão` };
    version = next;
  }

  const envelope = envelopeSchema.safeParse(current);
  if (!envelope.success) return { status: "corrupt", reason: "estrutura inválida" };
  const save = current as SaveFile;
  if (!validateBank(save.bank).ok) return { status: "corrupt", reason: "banco inválido" };
  const incoherence = leagueProblem(save);
  if (incoherence) return { status: "corrupt", reason: incoherence };
  const season = save.league.divisions.find((entry) => entry.clubIds.includes(save.clubId));
  if (!season) return { status: "corrupt", reason: "clube fora das divisões" };
  const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
  const lineup = validateLineup(
    save.lineup,
    squad,
    clubUnavailability(season, save.bank, save.clubId),
  );
  if (lineup.issues.some((issue) => BROKEN_LINEUP.has(issue.code))) {
    return { status: "corrupt", reason: "escalação inválida" };
  }
  return original === target
    ? { status: "ok", save }
    : { status: "ok", save, migratedFrom: original };
}
