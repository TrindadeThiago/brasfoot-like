import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { betaReleaseNotes, releaseNotes, releaseNotesSchema } from "../src";

const { version } = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../package.json"), "utf8"),
) as { version: string };

describe("notas de versão (016 US5)", () => {
  it("são válidas e têm a versão atual do jogo", () => {
    const notes = releaseNotes("pt-BR");
    expect(notes.map((note) => note.version)).toContain(version);
    expect(notes[0]?.version).toBe(version);
  });

  it("as notas atuais terminam no 1.0.0 e as notas beta não se misturam com ela (025 FR-018/FR-020)", () => {
    const current = releaseNotes("pt-BR");
    const beta = betaReleaseNotes("pt-BR");
    expect(current.at(-1)?.version).toBe("1.0.0");
    // Nenhuma versão beta (1.x.0 de 20 a 28 de outubro) entra nas notas atuais além do próprio 1.0.0.
    expect(current.map((note) => note.version)).not.toContain("1.10.0");
    expect(beta).toHaveLength(23);
    expect(beta[0]?.version).toBe("1.10.0");
    expect(beta.at(-1)?.version).toBe("1.0.0");
    // O 1.0.0 do beta é outro texto: a verificação de publicação lê só `releaseNotes`.
    expect(beta.at(-1)?.changes).not.toEqual(current.at(-1)?.changes);
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
