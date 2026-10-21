"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  type Preferences,
  parsePreferences,
  preferencesSnapshot,
  subscribePreferences,
} from "./preferences";

/** Preferências atuais, re-renderizando quando mudam (016). */
export function usePreferences(): Preferences {
  const raw = useSyncExternalStore(subscribePreferences, preferencesSnapshot, () => "");
  return useMemo(() => parsePreferences(raw || undefined), [raw]);
}
