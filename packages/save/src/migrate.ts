import { validateBank } from "@brasfoot-like/engine";
import { z } from "zod";
import { MANAGER_NAME_MAX, SAVE_FORMAT_VERSION, type SaveFile } from "./format";

/** Transforma um save da versão `from` na versão `from + 1`. */
export interface Migration {
  from: number;
  migrate(raw: unknown): unknown;
}

/** Migrações reais do formato; vazio enquanto só existe a versão 1. */
export const MIGRATIONS: readonly Migration[] = [];

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
  season: z.object({
    seed: z.union([z.string(), z.number()]),
    clubIds: z.array(z.string()),
    calendar: z.array(z.unknown()),
    nextRound: z.int().min(1),
    records: z.array(z.unknown()),
    status: z.record(z.string(), z.unknown()),
  }),
});

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
  if (!save.season.clubIds.includes(save.clubId) || String(save.season.seed) !== save.seed) {
    return { status: "corrupt", reason: "temporada incoerente com a carreira" };
  }
  return original === target
    ? { status: "ok", save }
    : { status: "ok", save, migratedFrom: original };
}
