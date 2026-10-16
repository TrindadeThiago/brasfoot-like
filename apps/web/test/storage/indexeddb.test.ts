import type { SaveFile } from "@brasfoot-like/save";
import { migrateSave } from "@brasfoot-like/save";
import { openDB } from "idb";
import { describe, expect, it } from "vitest";
import { createIndexedDbStore } from "../../src/storage/indexeddb";
import { careerSave } from "../helpers/saves";

let counter = 0;
const dbName = () => `store-${counter++}`;

describe("SaveStore no IndexedDB (FR-006 a FR-010)", () => {
  it("grava, lê e lista do mais recente para o mais antigo", async () => {
    const store = createIndexedDbStore(dbName(), migrateSave);
    const a = careerSave("a", "2026-10-16T10:00:00.000Z");
    const b = careerSave("b", "2026-10-16T11:00:00.000Z");
    expect((await store.save(a)).ok).toBe(true);
    expect((await store.save(b)).ok).toBe(true);
    const loaded = await store.load("a");
    expect(loaded.status === "ok" && loaded.save).toEqual(a);
    expect((await store.listSummaries()).map((summary) => summary.id)).toEqual(["b", "a"]);
  });

  it("apaga save e resumo", async () => {
    const store = createIndexedDbStore(dbName(), migrateSave);
    await store.save(careerSave("a"));
    await store.remove("a");
    expect(await store.listSummaries()).toEqual([]);
    expect((await store.load("a")).status).toBe("missing");
  });

  it("recusa gravar com savedAt esperado desatualizado (conflito)", async () => {
    const store = createIndexedDbStore(dbName(), migrateSave);
    const save = careerSave("a", "2026-10-16T10:00:00.000Z");
    await store.save(save);
    await store.save({ ...save, savedAt: "2026-10-16T10:05:00.000Z" });
    const stale = await store.save(
      { ...save, savedAt: "2026-10-16T10:06:00.000Z" },
      "2026-10-16T10:00:00.000Z",
    );
    expect(stale).toEqual({ ok: false, reason: "conflict" });
    const loaded = await store.load("a");
    expect(loaded.status === "ok" && loaded.save.savedAt).toBe("2026-10-16T10:05:00.000Z");
  });

  it("registro ilegível aparece como danificado na lista e ao abrir", async () => {
    const name = dbName();
    const store = createIndexedDbStore(name, migrateSave);
    await store.save(careerSave("ok"));
    const raw = await openDB(name, 1);
    await raw.put("saves", { lixo: true }, "quebrado");
    raw.close();
    const list = await store.listSummaries();
    expect(list.find((summary) => summary.id === "quebrado")?.status).toBe("corrupt");
    expect((await store.load("quebrado")).status).toBe("corrupt");
    expect(list.find((summary) => summary.id === "ok")?.status).toBe("ok");
  });

  it("save de versão futura aparece marcado e não abre", async () => {
    const name = dbName();
    const store = createIndexedDbStore(name, migrateSave);
    const future = { ...careerSave("futuro"), formatVersion: 99 } as SaveFile;
    await store.save(future);
    expect((await store.listSummaries())[0]?.status).toBe("future_version");
    expect(await store.load("futuro")).toEqual({ status: "future_version", version: 99 });
  });

  it("mapeia armazenamento cheio para 'quota'", async () => {
    const store = createIndexedDbStore(dbName(), migrateSave);
    const huge = careerSave("a");
    Object.defineProperty(huge, "bank", {
      get() {
        throw new DOMException("cheio", "QuotaExceededError");
      },
      enumerable: true,
    });
    expect(await store.save(huge)).toEqual({ ok: false, reason: "quota" });
  });
});
