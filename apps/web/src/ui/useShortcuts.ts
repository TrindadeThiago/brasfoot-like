"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { normalizeKey, type ShortcutId, shortcutById } from "./shortcuts";

/**
 * Atalhos por id do registro (`shortcuts.ts`, 016); as teclas vêm do registro. Ignorados com o
 * foco em campos de texto, com teclas modificadoras e com um diálogo aberto (menos a ajuda).
 */
export function useShortcuts(handlers: Partial<Record<ShortcutId, () => void>>): void {
  // O listener é registrado uma vez e sempre lê os atalhos mais recentes.
  const current = useRef(handlers);
  useLayoutEffect(() => {
    current.current = handlers;
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable)
        return;
      const key = normalizeKey(event.key);
      if (document.querySelector("[role='dialog'][aria-modal='true']") && key !== "?") return;
      for (const [id, handler] of Object.entries(current.current)) {
        if (handler && shortcutById(id as ShortcutId).keys.includes(key)) {
          event.preventDefault();
          handler();
          return;
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}
