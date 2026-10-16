"use client";

import { useEffect } from "react";

/** Atalhos globais; ignorados com o foco em campos de texto ou com teclas modificadoras. */
export function useShortcuts(handlers: Record<string, () => void>): void {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable)
        return;
      if (document.querySelector("[role='dialog']") && event.key !== "?") return;
      const handler = handlers[event.key.length === 1 ? event.key.toLowerCase() : event.key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handlers]);
}
