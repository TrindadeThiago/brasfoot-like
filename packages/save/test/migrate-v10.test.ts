import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV9, validSave } from "./fixtures";

describe("migração v9 → v10 (014 R10, FR-018, SC-008)", () => {
  it("notícias vazias e o resto preservado", () => {
    const v9 = saveV9();
    const result = migrateSave(v9);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(9);
    expect(result.save.formatVersion).toBe(16);
    expect(result.save.news.feed).toEqual([]);
    expect(result.save.news.records).toEqual({ league: {}, clubs: {} });
    const {
      formatVersion: _v,
      news: _news,
      assets: _assets,
      calendar: _calendar,
      competitions: _competitions,
      fitness: _fitness,
      competitionHistory: _competitionHistory,
      cupHistory: _cupHistory,
      ...rest
    } = result.save;
    const { formatVersion: _v9, ...restV9 } = v9;
    expect(rest).toEqual(restV9);
  });

  it("temporadas já encerradas ganham registro sem artilheiro; campeões continuam no histórico", () => {
    const v9 = saveV9();
    v9.history = [
      { number: 1, year: 2027, competitionId: v9.league.competitionId, divisions: [] },
    ] as typeof v9.history;
    const result = migrateSave(v9);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.save.news.seasons).toEqual([{ season: 1, year: 2027, scorers: [] }]);
    expect(result.save.history).toHaveLength(1);
  });

  it("v10 sem notícias ⇒ corrupt", () => {
    const save = validSave();
    Reflect.deleteProperty(save, "news");
    expect(migrateSave(save as SaveFile).status).toBe("corrupt");
  });
});
