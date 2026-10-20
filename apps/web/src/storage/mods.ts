import type { ModPackageResult, ModSummary } from "@brasfoot-like/modkit";
import { openAppDb } from "./indexeddb";

/** Mod guardado no navegador (015 R7): arquivos de dados já lidos e imagens em data URI. */
export interface StoredMod {
  id: string;
  summary: ModSummary;
  files: Record<string, unknown>;
  images: Record<string, string>;
  addedAt: string;
}

export interface ModStore {
  list(): Promise<StoredMod[]>;
  get(id: string): Promise<StoredMod | undefined>;
  put(mod: StoredMod): Promise<void>;
  remove(id: string): Promise<void>;
}

/** Mods no IndexedDB do app, no store `mods`. */
export function createModStore(name = "brasfoot-like"): ModStore {
  return {
    async list() {
      const handle = await openAppDb(name);
      const mods = (await handle.getAll("mods")) as StoredMod[];
      return mods.sort((a, b) => a.summary.name.localeCompare(b.summary.name, "pt-BR"));
    },
    async get(id) {
      const handle = await openAppDb(name);
      return (await handle.get("mods", id)) as StoredMod | undefined;
    },
    async put(mod) {
      const handle = await openAppDb(name);
      await handle.put("mods", mod, mod.id);
    },
    async remove(id) {
      const handle = await openAppDb(name);
      await handle.delete("mods", id);
    },
  };
}

/** Mod pronto para guardar a partir de um pacote aceito. */
export function storedModOf(
  result: Extract<ModPackageResult, { ok: true }>,
  now: string,
): StoredMod {
  return {
    id: result.summary.id,
    summary: result.summary,
    files: result.files,
    images: result.images,
    addedAt: now,
  };
}
