import { advanceSeason } from "@brasfoot-like/engine";
import { migrateSave, type SaveFile } from "@brasfoot-like/save";
import { createIndexedDbStore, type SaveStore } from "../../src/storage/indexeddb";
import { careerSave } from "./saves";

let counter = 0;

/** Carreira salva num IndexedDB novo, já avançada até a rodada pedida. */
export async function storedCareer(
  round = 1,
  edit?: (save: SaveFile) => SaveFile,
): Promise<{ store: SaveStore; save: SaveFile }> {
  let save = careerSave("tela");
  if (round > 1) {
    const advanced = advanceSeason(save.season, save.bank, { rounds: round - 1 });
    if (!advanced.ok) throw new Error("falhou");
    save = { ...save, season: advanced.season };
  }
  if (edit) save = edit(save);
  const store = createIndexedDbStore(`tela-${counter++}`, migrateSave);
  await store.save(save);
  return { store, save };
}
