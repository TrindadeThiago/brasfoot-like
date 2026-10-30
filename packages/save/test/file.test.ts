import { gzipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import {
  advanceCareerSeason,
  asCopy,
  exportSave,
  importSave,
  MAX_SAVE_BYTES,
  type SaveFile,
  saveFileName,
} from "../src";
import { saveV6, validSave } from "./fixtures";
import { playRounds } from "./helpers";

function withoutSavedAt(save: SaveFile) {
  const { savedAt: _savedAt, ...rest } = save;
  return rest;
}

function roundTrip(save: SaveFile) {
  const result = importSave(exportSave(save, "2026-10-20T00:00:00.000Z"));
  if (result.status !== "ok") throw new Error(JSON.stringify(result));
  return result;
}

describe("arquivo de save (015 US1, critério de aceite 1, SC-001, SC-002)", () => {
  it("ida e volta idêntica no início, no meio e no fim da temporada e depois da virada", () => {
    const start = validSave();
    const middle = playRounds(start, 12);
    const end = playRounds(middle, 100);
    const turned = advanceCareerSeason(end, "2026-10-20T00:00:00.000Z");
    if (!turned.ok) throw new Error("virada");
    for (const save of [start, middle, end, turned.save]) {
      expect(withoutSavedAt(roundTrip(save).save)).toEqual(withoutSavedAt(save));
    }
  }, 120_000);

  it("aceita o envelope em JSON puro (sem compactação)", () => {
    const save = validSave();
    const plain = strToU8(JSON.stringify({ format: "brasfoot-like-save", exportedAt: "x", save }));
    expect(importSave(plain).status).toBe("ok");
  });

  it("save de versão antiga passa pelas migrações", () => {
    const old = saveV6();
    const bytes = gzipSync(
      strToU8(JSON.stringify({ format: "brasfoot-like-save", exportedAt: "x", save: old })),
    );
    const result = importSave(bytes);
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.migratedFrom).toBe(6);
  });

  it("lixo, outro JSON, save corrompido e versão futura são recusados", () => {
    expect(importSave(new Uint8Array([1, 2, 3, 4])).status).toBe("not_a_save");
    expect(importSave(strToU8(JSON.stringify({ hello: "world" }))).status).toBe("not_a_save");
    const broken = { ...validSave(), league: null };
    expect(
      importSave(strToU8(JSON.stringify({ format: "brasfoot-like-save", save: broken }))).status,
    ).toBe("corrupt");
    const future = { ...validSave(), formatVersion: 999 };
    const result = importSave(
      strToU8(JSON.stringify({ format: "brasfoot-like-save", save: future })),
    );
    expect(result).toEqual({ status: "future_version", version: 999 });
  });

  it("gzip que expande além do limite é recusado, mesmo com o rodapé mentindo", () => {
    const honest = gzipSync(new Uint8Array(MAX_SAVE_BYTES + 1024), { level: 9 });
    expect(importSave(honest).status).toBe("not_a_save");
    const forged = honest.slice();
    new DataView(forged.buffer).setUint32(forged.length - 4, 1000, true);
    expect(importSave(forged).status).toBe("not_a_save");
  });

  it("cópia com id novo e nome de arquivo seguro", () => {
    const save = validSave();
    const copy = asCopy(save, "outro-id", "2026-10-21T00:00:00.000Z");
    expect(copy.id).toBe("outro-id");
    expect(copy.createdAt).toBe("2026-10-21T00:00:00.000Z");
    expect(saveFileName(save)).toMatch(/^[a-z0-9-]+\.blsave$/);
  });

  it("exportar e importar uma carreira longa é rápido (SC-007)", () => {
    let save = validSave();
    for (let season = 0; season < 3; season++) {
      save = playRounds(save, 100);
      const turned = advanceCareerSeason(save, "2026-10-20T00:00:00.000Z");
      if (!turned.ok) throw new Error("virada");
      save = turned.save;
    }
    const started = performance.now();
    roundTrip(save);
    expect(performance.now() - started).toBeLessThan(5000);
  }, 120_000);
});
