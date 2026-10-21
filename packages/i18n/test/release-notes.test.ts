import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { releaseNotes, releaseNotesSchema } from "../src";

const { version } = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../package.json"), "utf8"),
) as { version: string };

describe("notas de versão (016 US5)", () => {
  it("são válidas e têm a versão atual do jogo", () => {
    const notes = releaseNotes("pt-BR");
    expect(notes.map((note) => note.version)).toContain(version);
    expect(notes[0]?.version).toBe(version);
  });

  it("recusam versão repetida, fora de ordem, data inválida e lista vazia", () => {
    const note = { version: "1.0.0", date: "2026-10-20", changes: ["x"] };
    expect(releaseNotesSchema.safeParse([note, note]).success).toBe(false);
    expect(releaseNotesSchema.safeParse([note, { ...note, version: "1.1.0" }]).success).toBe(false);
    expect(releaseNotesSchema.safeParse([{ ...note, date: "20/10/2026" }]).success).toBe(false);
    expect(releaseNotesSchema.safeParse([{ ...note, changes: [] }]).success).toBe(false);
    expect(releaseNotesSchema.safeParse([{ ...note, version: "1.1.0" }, note]).success).toBe(true);
  });
});
