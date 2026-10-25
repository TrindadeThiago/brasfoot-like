import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  exportSave,
  importSave,
  isCareerSeasonOver,
  migrateSave,
  SAVE_FORMAT_VERSION,
  type SaveFile,
} from "../src";
import { playDay, type SaveV11Step, saveV15 } from "./fixtures";

// 021 (T018): a migração v15 → v16 só sobe a versão; um save antigo é um mundo sem vagas.
const STEPS: [string, SaveV11Step][] = [
  ["início da temporada", { rounds: 0 }],
  ["depois de 17 rodadas", { rounds: 17 }],
  ["fim da temporada", { toEnd: true }],
  ["depois de 3 temporadas", { seasons: 3 }],
];

describe("migração v15 → v16 (021 R11, FR-022)", () => {
  it.each(STEPS)(
    "%s: abre igual, como mundo sem vagas entre competições",
    (_label, step) => {
      const v15 = saveV15(step);
      const result = migrateSave(v15);
      if (result.status !== "ok") throw new Error(JSON.stringify(result));
      expect(result.migratedFrom).toBe(15);
      expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
      const { formatVersion: _a, ...rest } = result.save;
      const { formatVersion: _b, ...restV15 } = v15;
      expect(rest).toEqual(restV15);
      // Sem vagas: nada de histórico de classificação nem origens nas temporadas.
      expect(result.save.qualificationHistory).toBeUndefined();
      const leagues = [result.save.league, ...result.save.competitions];
      expect(leagues.every((league) => league.origins === undefined)).toBe(true);
    },
    120_000,
  );

  it("o save migrado a meio da temporada joga até a virada", () => {
    const result = migrateSave(saveV15({ rounds: 17 }));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    let save: SaveFile = result.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    expect(advanceCareerSeason(save, "2026-10-24T00:00:00.000Z").ok).toBe(true);
  }, 300_000);

  it("um arquivo exportado na v15 passa pela mesma migração ao importar", () => {
    const bytes = exportSave(
      saveV15({ rounds: 5 }) as unknown as SaveFile,
      "2026-10-24T00:00:00.000Z",
    );
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(15);
    expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  }, 120_000);
});
