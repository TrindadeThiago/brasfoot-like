import { migrateSave } from "@brasfoot-like/save";
import { describe, expect, it } from "vitest";
import { createIndexedDbStore } from "../../src/storage/indexeddb";
import { careerSave } from "../helpers/saves";

describe("duas abas (FR-013)", () => {
  it("a aba com savedAt antigo recebe conflito e não sobrescreve; sobrescrever explícito funciona", async () => {
    const tabA = createIndexedDbStore("abas", migrateSave);
    const tabB = createIndexedDbStore("abas", migrateSave);
    const opened = careerSave("c", "2026-10-16T10:00:00.000Z");
    await tabA.save(opened);
    await tabB.save({ ...opened, savedAt: "2026-10-16T10:10:00.000Z", managerName: "Outra aba" });
    const attempt = await tabA.save(
      { ...opened, savedAt: "2026-10-16T10:11:00.000Z" },
      opened.savedAt,
    );
    expect(attempt).toEqual({ ok: false, reason: "conflict" });
    const current = await tabA.load("c");
    expect(current.status === "ok" && current.save.managerName).toBe("Outra aba");
    const overwrite = await tabA.save(
      { ...opened, savedAt: "2026-10-16T10:12:00.000Z" },
      "2026-10-16T10:10:00.000Z",
    );
    expect(overwrite.ok).toBe(true);
  });
});
