import { createFinances } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV1, saveV3MidSeason, saveV3SeasonOver, validSave, withoutMarket } from "./fixtures";

function migrated(raw: unknown) {
  const result = migrateSave(raw);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result;
}

describe("migração v3 → v4 (R12, FR-026, SC-008)", () => {
  it.each([
    ["meio da temporada", saveV3MidSeason],
    ["temporada encerrada", saveV3SeasonOver],
  ])(
    "acrescenta as finanças iniciais (%s) e mantém o resto",
    (_label, build) => {
      const v3 = build();
      const result = migrated(v3);
      expect(result.migratedFrom).toBe(3);
      expect(result.save.formatVersion).toBe(12);
      expect(result.save.finances).toEqual(createFinances(result.save.bank, v3.league));
      const {
        finances: _finances,
        renewal: _renewal,
        formatVersion: _v,
        ...rest
      } = withoutMarket(result.save);
      const { formatVersion: _v3, ...restV3 } = v3;
      expect(rest).toEqual(restV3);
    },
    60000,
  );

  it("é determinística", () => {
    expect(migrated(saveV3MidSeason()).save).toEqual(migrated(saveV3MidSeason()).save);
  }, 60000);

  it("v1 → v5 em cadeia", () => {
    const result = migrated(saveV1());
    expect(result.migratedFrom).toBe(1);
    expect(result.save.formatVersion).toBe(12);
    expect(Object.keys(result.save.finances.clubs)).toHaveLength(40);
  });
});

describe("validação do save v4", () => {
  it.each([
    [
      "clube sem finanças",
      (save: SaveFile) => {
        const first = Object.keys(save.finances.clubs)[0] as string;
        delete save.finances.clubs[first];
      },
    ],
    [
      "caixa que não bate com os lançamentos",
      (save: SaveFile) => {
        const club = Object.values(save.finances.clubs)[0];
        if (club) club.cash += 1;
      },
    ],
    [
      "preço fora da faixa",
      (save: SaveFile) => {
        const club = Object.values(save.finances.clubs)[0];
        if (club) club.ticketPrice = 100_000;
      },
    ],
    ["sem finanças", (save: SaveFile) => Reflect.deleteProperty(save, "finances")],
  ])("%s ⇒ corrupt", (_label, mutate) => {
    const save = validSave();
    mutate(save);
    expect(migrateSave(save).status).toBe("corrupt");
  });
});
