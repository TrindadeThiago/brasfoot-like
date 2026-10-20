import { describe, expect, it } from "vitest";
import { MIGRATIONS, type Migration, migrateSave, SAVE_FORMAT_VERSION } from "../src";
import { saveV1, validSave } from "./fixtures";

/** Save "v0" simulado: o técnico ficava em `coach` e não havia `createdAt`. */
function legacyV0() {
  const { managerName, createdAt: _createdAt, ...rest } = saveV1();
  return { ...rest, formatVersion: 0, coach: managerName };
}

const v0toV1: Migration = {
  from: 0,
  migrate(raw) {
    const { coach, ...rest } = raw as { coach: string; savedAt: string } & Record<string, unknown>;
    return { ...rest, formatVersion: 1, managerName: coach, createdAt: rest.savedAt };
  },
};

describe("migrateSave (FR-009, FR-010, SC-004)", () => {
  it("save atual passa sem migração", () => {
    const result = migrateSave(validSave());
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.migratedFrom).toBeUndefined();
      expect(result.save).toEqual(validSave());
    }
  });

  it("migra um save de versão anterior (simulado) e preserva os dados", () => {
    const result = migrateSave(legacyV0(), [v0toV1, ...MIGRATIONS]);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.migratedFrom).toBe(0);
    expect(result.save.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(result.save.managerName).toBe("Ana Souza");
    expect(result.save.league.divisions[0]).toEqual(validSave().league.divisions[0]);
    expect(result.save.league).toEqual(validSave().league);
    expect(result.save.bank).toEqual(validSave().bank);
    expect(result.save.lineup).toEqual(validSave().lineup);
  });

  it("aplica as migrações em cadeia, na ordem", () => {
    const order: number[] = [];
    const chain: Migration[] = [
      {
        from: 6,
        migrate: (raw) => {
          order.push(6);
          return (MIGRATIONS[5] as Migration).migrate(raw);
        },
      },
      {
        from: 5,
        migrate: (raw) => {
          order.push(5);
          return (MIGRATIONS[4] as Migration).migrate(raw);
        },
      },
      {
        from: 4,
        migrate: (raw) => {
          order.push(4);
          return (MIGRATIONS[3] as Migration).migrate(raw);
        },
      },
      {
        from: 3,
        migrate: (raw) => {
          order.push(3);
          return (MIGRATIONS[2] as Migration).migrate(raw);
        },
      },
      {
        from: 2,
        migrate: (raw) => {
          order.push(2);
          return (MIGRATIONS[1] as Migration).migrate(raw);
        },
      },
      {
        from: 1,
        migrate: (raw) => {
          order.push(1);
          return (MIGRATIONS[0] as Migration).migrate(raw);
        },
      },
      {
        from: 0,
        migrate: (raw) => {
          order.push(0);
          return v0toV1.migrate(raw);
        },
      },
    ];
    const result = migrateSave(legacyV0(), chain, 7);
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(result.status).toBe("ok");
  });

  it("versão futura não abre e não altera a entrada", () => {
    const future = { ...validSave(), formatVersion: SAVE_FORMAT_VERSION + 1 };
    const before = JSON.stringify(future);
    expect(migrateSave(future)).toEqual({
      status: "future_version",
      version: SAVE_FORMAT_VERSION + 1,
    });
    expect(JSON.stringify(future)).toBe(before);
  });

  it.each([
    ["lixo", "não é um save"],
    ["sem campos", { formatVersion: 1 }],
    ["banco inválido", { ...validSave(), bank: { manifest: {} } }],
    ["liga de outro formato", { ...validSave(), league: { divisions: "x" } }],
    ["clube fora da temporada", { ...validSave(), clubId: "clube-999" }],
    ["sem migração para a versão", { ...validSave(), formatVersion: 0 }],
  ])("%s ⇒ corrupt", (_, raw) => {
    expect(migrateSave(raw).status).toBe("corrupt");
  });
});
