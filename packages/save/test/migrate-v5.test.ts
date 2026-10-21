import { initialRenewal } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV1, saveV4MidSeason, saveV4SeasonOver, validSave, withoutMarket } from "./fixtures";

function migrated(raw: unknown) {
  const result = migrateSave(raw);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result;
}

describe("migração v4 → v5 (009 R12, FR-019, SC-008)", () => {
  it.each([
    ["meio da temporada", saveV4MidSeason],
    ["temporada encerrada", saveV4SeasonOver],
  ])(
    "acrescenta o estado de renovação (%s) e mantém o resto",
    (_label, build) => {
      const v4 = build();
      const result = migrated(v4);
      expect(result.migratedFrom).toBe(4);
      expect(result.save.formatVersion).toBe(12);
      expect(result.save.renewal).toEqual(initialRenewal(v4.bank));
      const { renewal: _renewal, formatVersion: _v, ...rest } = withoutMarket(result.save);
      const { formatVersion: _v4, ...restV4 } = v4;
      expect(rest).toEqual(restV4);
    },
    60000,
  );

  it("é determinística", () => {
    expect(migrated(saveV4MidSeason()).save).toEqual(migrated(saveV4MidSeason()).save);
  }, 60000);

  it("v1 → v6 em cadeia", () => {
    const result = migrated(saveV1());
    expect(result.migratedFrom).toBe(1);
    expect(result.save.formatVersion).toBe(12);
    expect(result.save.renewal.nextPlayerSeq).toBeGreaterThan(1);
  });

  it.each([
    [
      "sequência que repetiria ids",
      (save: SaveFile) => Object.assign(save.renewal, { nextPlayerSeq: 1 }),
    ],
    ["sem renovação", (save: SaveFile) => Reflect.deleteProperty(save, "renewal")],
  ])("v5 com %s ⇒ corrupt", (_label, mutate) => {
    const save = validSave();
    mutate(save);
    expect(migrateSave(save).status).toBe("corrupt");
  });
});
