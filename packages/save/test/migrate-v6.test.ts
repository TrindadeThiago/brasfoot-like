import { emptyMarket, ensureContracts } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { saveV1, saveV5MidSeason, saveV5SeasonOver, validSave, withoutMarket } from "./fixtures";

function migrated(raw: unknown) {
  const result = migrateSave(raw);
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result;
}

describe("migração v5 → v6 (010 R13, FR-024, SC-008)", () => {
  it.each([
    ["meio da temporada", saveV5MidSeason],
    ["temporada encerrada", saveV5SeasonOver],
  ])(
    "dá contrato a todos os jogadores e mercado vazio (%s)",
    (_label, build) => {
      const v5 = build();
      const result = migrated(v5);
      expect(result.migratedFrom).toBe(5);
      expect(result.save.formatVersion).toBe(8);
      expect(result.save.market).toEqual(emptyMarket());
      expect(result.save.bank).toEqual(ensureContracts(v5.bank, v5.league.year, v5.seed));
      expect(result.save.bank.players.every((player) => player.contract)).toBe(true);
      const { formatVersion: _v, ...rest } = withoutMarket(result.save);
      const { formatVersion: _v5, ...restV5 } = v5;
      expect(rest).toEqual(restV5);
    },
    60000,
  );

  it("é determinística", () => {
    expect(migrated(saveV5MidSeason()).save).toEqual(migrated(saveV5MidSeason()).save);
  }, 60000);

  it("v1 → v7 em cadeia", () => {
    const result = migrated(saveV1());
    expect(result.migratedFrom).toBe(1);
    expect(result.save.formatVersion).toBe(8);
    expect(result.save.bank.players.every((player) => player.contract)).toBe(true);
  });

  it.each([
    ["sem mercado", (save: SaveFile) => Reflect.deleteProperty(save, "market")],
    [
      "livre também no banco",
      (save: SaveFile) => {
        const player = save.bank.players[0];
        if (player) {
          const { clubId: _c, contract: _k, ...free } = player;
          save.market.freeAgents.push({ player: free, lastClubId: player.clubId, sinceYear: 1 });
        }
      },
    ],
    [
      "jogador sem contrato",
      (save: SaveFile) => {
        const player = save.bank.players[0];
        if (player) Reflect.deleteProperty(player, "contract");
      },
    ],
  ])("v6 com %s ⇒ corrupt", (_label, mutate) => {
    const save = validSave();
    mutate(save);
    expect(migrateSave(save).status).toBe("corrupt");
  });
});
