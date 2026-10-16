import { clubUnavailability, managerAutoLineup } from "@brasfoot-like/engine";
import { describe, expect, it } from "vitest";
import { migrateSave, type SaveFile } from "../src";
import { validSave } from "./fixtures";

/** Save no formato da 004 (versão 1): sem escalação. */
function saveV1(mutate?: (save: SaveFile) => void) {
  const save = validSave();
  mutate?.(save);
  const { lineup: _lineup, lineupNotice: _notice, ...rest } = save;
  return { ...rest, formatVersion: 1 };
}

describe("migração v1 → v2 (FR-024, SC-007)", () => {
  it("acrescenta a escalação automática no esquema do clube e preserva o resto", () => {
    const v1 = saveV1();
    const result = migrateSave(v1);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.migratedFrom).toBe(1);
    const { save } = result;
    expect(save.formatVersion).toBe(2);
    const squad = save.bank.players.filter((player) => player.clubId === save.clubId);
    const expected = managerAutoLineup(
      squad,
      save.season.formations[save.clubId] ?? "4-4-2",
      "balanced",
      clubUnavailability(save.season, save.bank, save.clubId),
    ).lineup;
    expect(save.lineup).toEqual(expected);
    const { lineup: _lineup, ...rest } = save;
    expect({ ...rest, formatVersion: 1 }).toEqual(v1);
  });

  it("considera os indisponíveis do momento da migração", () => {
    const base = validSave();
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
    const save = validSave();
    mutate(save);
    expect(migrateSave(save).status).toBe("corrupt");
  });

  it("v2 com vaga vazia (escalação em edição) abre", () => {
    const save = validSave();
    delete save.lineup.starters.gk;
    expect(migrateSave(save).status).toBe("ok");
  });

  it("v3 não abre", () => {
    expect(migrateSave({ ...validSave(), formatVersion: 3 })).toEqual({
      status: "future_version",
      version: 3,
    });
  });
});
