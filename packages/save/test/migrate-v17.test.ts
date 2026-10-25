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
import { playDay, type SaveV11Step, saveV16 } from "./fixtures";

// 022 (T013): a migração v16 → v17 só sobe a versão; um save antigo é um mundo sem competição
// entre países.
const STEPS: [string, SaveV11Step][] = [
  ["início da temporada", { rounds: 0 }],
  ["depois de 17 rodadas", { rounds: 17 }],
  ["fim da temporada", { toEnd: true }],
  ["depois de 3 temporadas", { seasons: 3 }],
];

describe("migração v16 → v17 (022 R12, FR-026)", () => {
  it.each(STEPS)(
    "%s: abre igual, como mundo sem competição entre países",
    (_label, step) => {
      const v16 = saveV16(step);
      const result = migrateSave(v16);
      if (result.status !== "ok") throw new Error(JSON.stringify(result));
      expect(result.migratedFrom).toBe(16);
      expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
      const { formatVersion: _a, ...rest } = result.save;
      const { formatVersion: _b, ...restV16 } = v16;
      expect(rest).toEqual(restV16);
      // Sem competição entre países: nada de histórico continental.
      expect(result.save.continentalHistory).toBeUndefined();
      expect(result.save.bank.competitions.every((entry) => entry.countryId !== undefined)).toBe(
        true,
      );
    },
    120_000,
  );

  it("o save migrado a meio da temporada joga até a virada", () => {
    const result = migrateSave(saveV16({ rounds: 17 }));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    let save: SaveFile = result.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    expect(advanceCareerSeason(save, "2026-10-25T00:00:00.000Z").ok).toBe(true);
  }, 300_000);

  it("um arquivo exportado na v16 passa pela mesma migração ao importar", () => {
    const bytes = exportSave(
      saveV16({ rounds: 5 }) as unknown as SaveFile,
      "2026-10-25T00:00:00.000Z",
    );
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(16);
    expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
  }, 120_000);
});
