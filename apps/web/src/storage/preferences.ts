/** Preferências por navegador (conveniências: perdê-las não perde progresso). */
const KEY = "brasfoot-like:preferences";

export interface Preferences {
  lastCareerId?: string | undefined;
  squadSort?: { column: string; direction: "ascending" | "descending" };
  squadFilter?: { sector: SquadSector; availability: SquadAvailability };
  roundMode?: RoundMode;
  roundSpeed?: RoundSpeed;
  autoPause?: boolean;
}

export type RoundMode = "live" | "direct";
export type RoundSpeed = "slow" | "normal" | "fast";

export type SquadSector = "all" | "GK" | "DEF" | "MID" | "ATT";
export type SquadAvailability = "all" | "available" | "unavailable";

export function readPreferences(): Preferences {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Preferences) : {};
  } catch {
    return {};
  }
}

export function writePreferences(update: Partial<Preferences>): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify({ ...readPreferences(), ...update }));
  } catch {
    // Armazenamento indisponível: preferências são opcionais.
  }
}
