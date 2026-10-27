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
import { playDay, type SaveV11Step, saveV17 } from "./fixtures";

// 023 (T012): a migração v17 → v18 só sobe a versão; um save antigo é um mundo sem estadual.
const STEPS: [string, SaveV11Step][] = [
  ["início da temporada", { rounds: 0 }],
  ["depois de 17 rodadas", { rounds: 17 }],
  ["fim da temporada", { toEnd: true }],
  ["depois de 3 temporadas", { seasons: 3 }],
];

describe("migração v17 → v18 (023 R11, FR-019)", () => {
  it.each(STEPS)(
    "%s: abre igual, como mundo sem estadual",
    (_label, step) => {
      const v17 = saveV17(step);
      const result = migrateSave(v17);
      if (result.status !== "ok") throw new Error(JSON.stringify(result));
      expect(result.migratedFrom).toBe(17);
      expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
      const { formatVersion: _a, ...rest } = result.save;
      const { formatVersion: _b, ...restV17 } = v17;
      expect(rest).toEqual(restV17);
      // Sem estadual: nada de histórico regional.
      expect(result.save.regionalHistory).toBeUndefined();
      expect(result.save.bank.competitions.every((entry) => entry.regional === undefined)).toBe(
        true,
      );
    },
    120_000,
  );

  it("o save migrado a meio da temporada joga até a virada", () => {
    const result = migrateSave(saveV17({ rounds: 17 }));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    let save: SaveFile = result.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    expect(advanceCareerSeason(save, "2026-10-27T00:00:00.000Z").ok).toBe(true);
  }, 300_000);

  it("um arquivo exportado na v17 passa pela mesma migração ao importar", () => {
    const bytes = exportSave(
      saveV17({ rounds: 5 }) as unknown as SaveFile,
      "2026-10-27T00:00:00.000Z",
    );
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(17);
    expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  }, 120_000);
});
