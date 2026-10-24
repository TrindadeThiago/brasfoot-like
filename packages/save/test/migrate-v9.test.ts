import { DEFAULT_FANS } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV8, validSave } from "./fixtures";

describe("migração v8 → v9 (013 R11, FR-019, SC-008)", () => {
  it("torcidas neutras e rivalidades do banco padrão", () => {
    const v8 = saveV8();
    expect(v8.bank.rivalries).toBeUndefined();
    const result = migrateSave(v8);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(8);
    expect(result.save.formatVersion).toBe(15);
    expect(
      Object.values(result.save.fans.clubs).every((club) => club.mood === DEFAULT_FANS.neutral),
    ).toBe(true);
    expect(result.save.bank.rivalries).toEqual(validSave().bank.rivalries);
    const {
      formatVersion: _v,
      fans: _fans,
      news: _news,
      assets: _assets,
      calendar: _calendar,
      competitions: _competitions,
      fitness: _fitness,
      competitionHistory: _competitionHistory,
      cupHistory: _cupHistory,
      bank,
      ...rest
    } = result.save;
    const { formatVersion: _v8, bank: bankV8, ...restV8 } = v8;
    expect(rest).toEqual(restV8);
    const { rivalries: _rivalries, ...bankRest } = bank;
    expect(bankRest).toEqual(bankV8);
  });

  it("banco de outro mod fica sem rivalidades", () => {
    const v8 = saveV8();
    v8.bank.manifest.id = "outro-mod";
    const result = migrateSave(v8);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.save.bank.rivalries).toBeUndefined();
  });

  it("v9 sem torcidas ⇒ corrupt", () => {
    const save = validSave();
    Reflect.deleteProperty(save, "fans");
    expect(migrateSave(save as SaveFile).status).toBe("corrupt");
  });
});
