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
import { playDay, type SaveV11Step, saveV14 } from "./fixtures";

// 020 (T024): a migração v14 → v15 só sobe a versão; um save antigo é um mundo de um país.
const STEPS: [string, SaveV11Step][] = [
  ["início da temporada", { rounds: 0 }],
  ["depois de 17 rodadas", { rounds: 17 }],
  ["fim da temporada", { toEnd: true }],
  ["depois de 3 temporadas", { seasons: 3 }],
];

describe("migração v14 → v15 (020 R11, FR-021)", () => {
  it("o formato atual é o 15", () => {
    expect(SAVE_FORMAT_VERSION).toBe(15);
  });

  it.each(STEPS)(
    "%s: abre igual, como mundo de um país",
    (_label, step) => {
      const v14 = saveV14(step);
      const result = migrateSave(v14);
      if (result.status !== "ok") throw new Error(JSON.stringify(result));
      expect(result.migratedFrom).toBe(14);
      expect(result.save.formatVersion).toBe(15);
      const { formatVersion: _a, ...rest } = result.save;
      const { formatVersion: _b, ...restV14 } = v14;
      expect(rest).toEqual(restV14);
      // Um país só: a liga em foco é a principal e as outras competições são do mesmo país.
      const countries = new Set(
        [result.save.league, ...result.save.competitions].map(
          (league) =>
            result.save.bank.competitions.find((entry) => entry.id === league.competitionId)
              ?.countryId,
        ),
      );
      expect(countries.size).toBe(1);
    },
    120_000,
  );

  it("o save migrado a meio da temporada joga até a virada", () => {
    const result = migrateSave(saveV14({ rounds: 17 }));
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    let save: SaveFile = result.save;
    while (!isCareerSeasonOver(save)) save = playDay(save);
    expect(advanceCareerSeason(save, "2026-10-24T00:00:00.000Z").ok).toBe(true);
  }, 300_000);

  it("um arquivo exportado na v14 passa pela mesma migração ao importar", () => {
    const bytes = exportSave(
      saveV14({ rounds: 5 }) as unknown as SaveFile,
      "2026-10-24T00:00:00.000Z",
    );
    const result = importSave(bytes);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(14);
    expect(result.save.formatVersion).toBe(15);
  }, 120_000);
});
