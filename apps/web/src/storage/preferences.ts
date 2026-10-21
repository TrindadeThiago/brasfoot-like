import { z } from "zod";

/** Preferências por navegador (conveniências: perdê-las não perde progresso). */
const KEY = "brasfoot-like:preferences";

export type RoundMode = "live" | "direct";
export type RoundSpeed = "slow" | "normal" | "fast";
export type Theme = "system" | "light" | "dark";

export type SquadSector = "all" | "GK" | "DEF" | "MID" | "ATT";
export type SquadAvailability = "all" | "available" | "unavailable";

export interface TipsState {
  dismissed: string[];
  skipAll: boolean;
}

// Cada campo inválido vira ausente (FR-012, 016): nunca derruba a leitura.
const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const preferencesSchema = z
  .object({
    lastCareerId: optional(z.string()),
    squadSort: optional(
      z.object({ column: z.string(), direction: z.enum(["ascending", "descending"]) }),
    ),
    squadFilter: optional(
      z.object({
        sector: z.enum(["all", "GK", "DEF", "MID", "ATT"]),
        availability: z.enum(["all", "available", "unavailable"]),
      }),
    ),
    roundMode: optional(z.enum(["live", "direct"])),
    roundSpeed: optional(z.enum(["slow", "normal", "fast"])),
    autoPause: optional(z.boolean()),
    theme: optional(z.enum(["system", "light", "dark"])),
    locale: optional(z.string()),
    tips: optional(
      z.object({
        dismissed: z.array(z.string()).catch([]),
        skipAll: z.boolean().catch(false),
      }),
    ),
    lastSeenVersion: optional(z.string()),
  })
  .catch({});

export type Preferences = z.infer<typeof preferencesSchema>;

/** Configurações expostas na tela de Configurações, com os valores padrão (016). */
export interface Settings {
  roundSpeed: RoundSpeed;
  autoPause: boolean;
  theme: Theme;
  locale: string;
  tips: TipsState;
}

export const PREFERENCE_DEFAULTS: Settings = {
  roundSpeed: "normal",
  autoPause: true,
  theme: "system",
  locale: "pt-BR",
  tips: { dismissed: [], skipAll: false },
};

export function settingsOf(prefs: Preferences): Settings {
  return {
    roundSpeed: prefs.roundSpeed ?? PREFERENCE_DEFAULTS.roundSpeed,
    autoPause: prefs.autoPause ?? PREFERENCE_DEFAULTS.autoPause,
    theme: prefs.theme ?? PREFERENCE_DEFAULTS.theme,
    locale: prefs.locale ?? PREFERENCE_DEFAULTS.locale,
    tips: prefs.tips ?? PREFERENCE_DEFAULTS.tips,
  };
}

// Sem armazenamento (modo privado restrito), as preferências valem só nesta sessão.
let memory: string | undefined;
const listeners = new Set<() => void>();

function readRaw(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? undefined;
  } catch {
    return memory;
  }
}

function parse(raw: string | undefined): Preferences {
  if (!raw) return {};
  try {
    return preferencesSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function readPreferences(): Preferences {
  return parse(readRaw());
}

export function writePreferences(update: Partial<Preferences>): void {
  const raw = JSON.stringify({ ...readPreferences(), ...update });
  memory = raw;
  try {
    globalThis.localStorage?.setItem(KEY, raw);
  } catch {
    // Armazenamento indisponível: fica em memória.
  }
  for (const listener of listeners) listener();
}

/** Avisa quando as preferências mudam (nesta aba). */
export function subscribePreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Texto bruto atual, para snapshots estáveis (`useSyncExternalStore`). */
export function preferencesSnapshot(): string {
  return readRaw() ?? "";
}

export { parse as parsePreferences };
