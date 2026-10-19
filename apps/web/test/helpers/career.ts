import { advanceCareer, type Season } from "@brasfoot-like/engine";
import { migrateSave, type SaveFile, userDivisionLevel } from "@brasfoot-like/save";
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
    const advanced = advanceCareer(
      save.league,
      save.finances,
      save.bank,
      { rounds: round - 1 },
      save.clubId,
    );
    if (!advanced.ok) throw new Error("falhou");
    save = { ...save, league: advanced.league, finances: advanced.finances };
  }
  if (edit) save = edit(save);
  const store = createIndexedDbStore(`tela-${counter++}`, migrateSave);
  await store.save(save);
  return { store, save };
}

/** Save com a temporada da divisão do jogador trocada. */
export function withUserSeason(save: SaveFile, update: (season: Season) => Season): SaveFile {
  const level = userDivisionLevel(save);
  return {
    ...save,
    league: {
      ...save.league,
      divisions: save.league.divisions.map((season) =>
        season.divisionLevel === level ? update(season) : season,
      ),
    },
  };
}
