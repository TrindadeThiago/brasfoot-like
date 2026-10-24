import { clubUnavailability, managerAutoLineup } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile, userSeason } from "../src";
import { type SaveV2, saveV1, saveV2, withoutMarket } from "./fixtures";

describe("migração v1 → v2 (FR-024, SC-007)", () => {
  it("acrescenta a escalação automática no esquema do clube e preserva o resto", () => {
    const v1 = saveV1();
    const result = migrateSave(v1);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.migratedFrom).toBe(1);
    const { save } = result;
    expect(save.formatVersion).toBe(14);
    const season = userSeason(save);
    const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
    const expected = managerAutoLineup(
      squad,
      season.formations[save.clubId] ?? "4-4-2",
      "balanced",
      clubUnavailability(season, save.bank, save.clubId),
    ).lineup;
    expect(save.lineup).toEqual(expected);
    expect(season).toEqual(v1.season);
    const {
      lineup: _lineup,
      league: _league,
      history: _history,
      finances: _finances,
      renewal: _renewal,
      ...rest
    } = withoutMarket(save);
    const { season: _season, ...restV1 } = v1;
    expect({ ...rest, formatVersion: 1 }).toEqual(restV1);
  });

  it("considera os indisponíveis do momento da migração", () => {
    const base = saveV2();
    const keeper = base.lineup.starters.gk as string;
    const result = migrateSave(
      saveV1((save) => {
        save.season.status[keeper] = { yellows: 0, suspension: 0, injury: 2 };
      }),
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok")
      expect(Object.values(result.save.lineup.starters)).not.toContain(keeper);
  });

  it.each([
    ["sem escalação", (save: SaveFile) => Reflect.deleteProperty(save, "lineup")],
    [
      "esquema desconhecido",
      (save: SaveFile) => Object.assign(save.lineup, { formation: "9-9-9" }),
    ],
    [
      "jogador repetido",
      (save: SaveFile) => save.lineup.bench.push(save.lineup.starters.gk as string),
    ],
    [
      "jogador de outro clube",
      (save: SaveFile) => {
        const stranger = save.bank.players.find((player) => player.clubId !== save.clubId);
        save.lineup.starters.gk = stranger?.id as string;
      },
    ],
  ])("v2 com %s ⇒ corrupt", (_, mutate) => {
    const save = saveV2();
    mutate(save as unknown as SaveFile);
    expect(migrateSave(save).status).toBe("corrupt");
  });

  it("v2 com vaga vazia (escalação em edição) abre", () => {
    const save: SaveV2 = saveV2();
    delete save.lineup.starters.gk;
    expect(migrateSave(save).status).toBe("ok");
  });
});
