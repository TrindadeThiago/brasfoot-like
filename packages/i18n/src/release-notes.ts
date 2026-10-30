import { z } from "zod";
import ptBrNotes from "../locales/pt-BR/release-notes.json" with { type: "json" };
import ptBrBetaNotes from "../locales/pt-BR/release-notes-beta.json" with { type: "json" };
import type { Locale } from "./format";

const SEMVER = /^\d+\.\d+\.\d+$/;

function compare(a: string, b: string): number {
  const [x, y] = [a, b].map((value) => value.split(".").map(Number)) as [number[], number[]];
  for (let index = 0; index < 3; index++) {
    const diff = (x[index] ?? 0) - (y[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Notas de versão (016): da mais recente para a mais antiga, versões únicas. */
export const releaseNotesSchema = z
  .array(
    z.object({
      version: z.string().regex(SEMVER),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      changes: z.array(z.string().trim().min(1)).min(1),
    }),
  )
  .min(1)
  .refine(
    (notes) =>
      notes.every(
        (note, index) => index === 0 || compare(notes[index - 1]?.version ?? "", note.version) > 0,
      ),
    { message: "versões devem ser únicas e em ordem decrescente" },
  );

export type ReleaseNote = z.infer<typeof releaseNotesSchema>[number];

const NOTES: Record<Locale, unknown> = { "pt-BR": ptBrNotes };
const BETA_NOTES: Record<Locale, unknown> = { "pt-BR": ptBrBetaNotes };

export function releaseNotes(locale: Locale = "pt-BR"): ReleaseNote[] {
  return releaseNotesSchema.parse(NOTES[locale]);
}

/** Notas da fase beta (1.0.0 a 1.10.0, antes do lançamento oficial): mesmo esquema, arquivo próprio. */
export function betaReleaseNotes(locale: Locale = "pt-BR"): ReleaseNote[] {
  return releaseNotesSchema.parse(BETA_NOTES[locale]);
}
