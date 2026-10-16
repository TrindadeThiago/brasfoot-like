"use client";

import { useEffect } from "react";

/** Registra o service worker só no build de produção (no `next dev` ele atrapalharia o recarregamento). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem service worker o jogo funciona normalmente, só não abre offline.
    });
  }, []);
  return null;
}
