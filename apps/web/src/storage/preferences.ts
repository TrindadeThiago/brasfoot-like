/** Preferências por navegador (conveniências: perdê-las não perde progresso). */
const KEY = "brasfoot-like:preferences";

export interface Preferences {
  lastCareerId?: string | undefined;
  squadSort?: { column: string; direction: "ascending" | "descending" };
}

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
