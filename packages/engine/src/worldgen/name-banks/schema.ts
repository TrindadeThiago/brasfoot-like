import { z } from "zod";

const names = (min: number) =>
  z.array(z.string().min(1).max(40)).refine((items) => items.length >= min, {
    params: { code: "schema.invalid_length", min },
  });

/** Bancos de nomes do gerador: dados do jogo, não do banco gerado (data-model.md, NameBank). */
export const nameBankSchema = z.object({
  countryName: z.string().min(1).max(60),
  countryCode: z.string().regex(/^[A-Z]{3}$/),
  competitionName: z.string().min(1).max(80),
  /** Nome da copa nacional (018); padrão "Copa Nacional". */
  cupName: z.string().min(1).max(80).optional(),
  firstNames: names(200),
  surnames: names(200),
  cities: z.array(z.string().min(1).max(20)).refine((items) => items.length >= 60),
  clubPrefixes: names(4),
  clubSuffixes: names(4),
});

export type NameBank = z.infer<typeof nameBankSchema>;
