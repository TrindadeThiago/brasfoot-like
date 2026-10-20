import type { SaveFile, SaveSummary } from "@brasfoot-like/save";
import { migrateSave, SAVE_FORMAT_VERSION, summarize } from "@brasfoot-like/save";
import { type IDBPDatabase, openDB } from "idb";

export type LoadResult =
  | { status: "ok"; save: SaveFile; migratedFrom?: number }
  | { status: "future_version"; version: number }
  | { status: "corrupt"; reason: string }
  | { status: "missing" };

export type SaveWriteResult =
  | { ok: true; savedAt: string }
  | { ok: false; reason: "conflict" | "quota" | "unavailable" | "unknown" };

/** Resumo exibido na lista, com a situação do save. */
export type SummaryEntry = SaveSummary & { status: "ok" | "future_version" | "corrupt" };

export interface SaveStore {
  listSummaries(): Promise<SummaryEntry[]>;
  load(id: string): Promise<LoadResult>;
  save(file: SaveFile, expectedSavedAt?: string): Promise<SaveWriteResult>;
  remove(id: string): Promise<void>;
  /** Já existe uma carreira com esta identificação (importar save, 015). */
  exists(id: string): Promise<boolean>;
}

/** Transformação aplicada ao ler um save (migrações + validação), injetada para testes. */
export type SaveReader = (
  raw: unknown,
) =>
  | { status: "ok"; save: SaveFile; migratedFrom?: number }
  | { status: "future_version"; version: number }
  | { status: "corrupt"; reason: string };

/** v2 (015): store `mods` ao lado de `saves` e `summaries`. */
const DB_VERSION = 2;

const databases = new Map<string, Promise<IDBPDatabase>>();

/** Banco IndexedDB do app (um por nome), com todos os stores criados na atualização. */
export function openAppDb(name: string): Promise<IDBPDatabase> {
  let database = databases.get(name);
  if (!database) {
    database = openDB(name, DB_VERSION, {
      upgrade(upgrade) {
        for (const store of ["saves", "summaries", "mods"]) {
          if (!upgrade.objectStoreNames.contains(store)) upgrade.createObjectStore(store);
        }
      },
    });
    databases.set(name, database);
  }
  return database;
}

function corruptEntry(id: string): SummaryEntry {
  return {
    id,
    formatVersion: 0,
    managerName: "",
    clubId: "",
    clubName: "",
    clubCrest: { shape: "classic", colors: ["#555555", "#999999"], initials: "?" },
    divisionLevel: 0,
    divisionName: "",
    seasonYear: 0,
    round: 0,
    totalRounds: 0,
    seasonOver: false,
    savedAt: "",
    status: "corrupt",
  };
}

function errorReason(error: unknown): "quota" | "unavailable" | "unknown" {
  const name = error instanceof Error || error instanceof DOMException ? error.name : "";
  if (name === "QuotaExceededError") return "quota";
  if (name === "InvalidStateError" || name === "SecurityError" || name === "UnknownError")
    return "unavailable";
  return "unknown";
}

/**
 * Armazenamento das carreiras no IndexedDB (research.md R5): `saves` guarda o save completo e
 * `summaries` o resumo, gravados na mesma transação.
 */
export function createIndexedDbStore(name = "brasfoot-like", read?: SaveReader): SaveStore {
  const db = () => openAppDb(name);
  const reader: SaveReader = read ?? ((raw) => migrateSave(raw));

  return {
    async listSummaries() {
      const handle = await db();
      const summaries = new Map<string, SummaryEntry>();
      for (const value of (await handle.getAll("summaries")) as SummaryEntry[]) {
        const status =
          value.status === "corrupt"
            ? "corrupt"
            : value.formatVersion > SAVE_FORMAT_VERSION
              ? "future_version"
              : value.status;
        summaries.set(value.id, { ...value, status });
      }
      // Saves sem resumo legível são tratados como danificados (FR-010).
      for (const key of await handle.getAllKeys("saves")) {
        const id = String(key);
        if (!summaries.has(id)) summaries.set(id, corruptEntry(id));
      }
      return [...summaries.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    },

    async load(id) {
      const handle = await db();
      const raw: unknown = await handle.get("saves", id);
      if (raw === undefined) return { status: "missing" };
      const result = reader(raw);
      if (result.status === "corrupt" || result.status === "future_version") {
        const summary = (await handle.get("summaries", id)) as SummaryEntry | undefined;
        await handle.put(
          "summaries",
          { ...(summary ?? corruptEntry(id)), status: result.status },
          id,
        );
        return result;
      }
      if (result.migratedFrom !== undefined) {
        const tx = handle.transaction(["saves", "summaries"], "readwrite");
        await Promise.all([
          tx.objectStore("saves").put(result.save, id),
          tx.objectStore("summaries").put({ ...summarize(result.save), status: "ok" }, id),
          tx.done,
        ]);
      }
      return result;
    },

    async save(file, expectedSavedAt) {
      try {
        const handle = await db();
        const tx = handle.transaction(["saves", "summaries"], "readwrite");
        if (expectedSavedAt !== undefined) {
          const current = (await tx.objectStore("summaries").get(file.id)) as
            | SummaryEntry
            | undefined;
          if (current && current.savedAt !== expectedSavedAt) {
            tx.abort();
            await tx.done.catch(() => {});
            return { ok: false, reason: "conflict" };
          }
        }
        await Promise.all([
          tx.objectStore("saves").put(file, file.id),
          tx.objectStore("summaries").put(
            {
              ...summarize(file),
              status: file.formatVersion > SAVE_FORMAT_VERSION ? "future_version" : "ok",
            },
            file.id,
          ),
          tx.done,
        ]);
        return { ok: true, savedAt: file.savedAt };
      } catch (error) {
        return { ok: false, reason: errorReason(error) };
      }
    },

    async exists(id) {
      const handle = await db();
      return (await handle.getKey("saves", id)) !== undefined;
    },

    async remove(id) {
      const handle = await db();
      const tx = handle.transaction(["saves", "summaries"], "readwrite");
      await Promise.all([
        tx.objectStore("saves").delete(id),
        tx.objectStore("summaries").delete(id),
        tx.done,
      ]);
    },
  };
}
