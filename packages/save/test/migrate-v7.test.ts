import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV6, validSave } from "./fixtures";

describe("migração v6 → v7 (011 R13, FR-017, SC-009)", () => {
  it("acrescenta os resumos de janela vazios e mantém o resto", () => {
    const v6 = saveV6();
    const result = migrateSave(v6);
    if (result.status !== "ok") throw new Error(JSON.stringify(result));
    expect(result.migratedFrom).toBe(6);
    expect(result.save.formatVersion).toBe(11);
    expect(result.save.market.reports).toEqual([]);
    const {
      formatVersion: _v,
      market,
      board: _board,
      fans: _fans,
      news: _news,
      assets: _assets,
      ...rest
    } = result.save;
    const { formatVersion: _v6, market: oldMarket, ...restV6 } = v6;
    expect(rest).toEqual(restV6);
    expect({ ...market, reports: undefined }).toEqual({ ...oldMarket, reports: undefined });
  });

  it("v7 sem resumos ⇒ corrupt", () => {
    const save = validSave();
    Reflect.deleteProperty(save.market, "reports");
    expect(migrateSave(save as SaveFile).status).toBe("corrupt");
  });
});
