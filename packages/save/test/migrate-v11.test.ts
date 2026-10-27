import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV10, validSave } from "./fixtures";

describe("migração v10 → v11 (015 R6, FR-010)", () => {
  it("imagens vazias e o resto preservado", () => {
    const v10 = saveV10();
    const result = migrateSave(v10);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(10);
    expect(result.save.formatVersion).toBe(18);
    expect(result.save.assets).toEqual({});
    const {
      formatVersion: _v,
      assets: _assets,
      calendar: _calendar,
      competitions: _competitions,
      fitness: _fitness,
      competitionHistory: _competitionHistory,
      cupHistory: _cupHistory,
      ...rest
    } = result.save;
    const { formatVersion: _v10, ...restV10 } = v10;
    expect(rest).toEqual(restV10);
  });

  it("v11 sem imagens ⇒ corrupt", () => {
    const save = validSave();
    Reflect.deleteProperty(save, "assets");
    expect(migrateSave(save as SaveFile).status).toBe("corrupt");
  });
});
