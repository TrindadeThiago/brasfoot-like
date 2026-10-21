"use client";

import { useEffect, useSyncExternalStore } from "react";

// Versão nova em espera (016 R3): o aviso pede para recarregar; nada troca sozinho.
let waiting: ServiceWorker | undefined;
const listeners = new Set<() => void>();

function setWaiting(worker: ServiceWorker | undefined) {
  waiting = worker;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Há uma versão nova do jogo instalada, esperando o jogador aceitar. */
export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => waiting !== undefined,
    () => false,
  );
}

/** Ativa a versão em espera; a página recarrega quando ela assumir o controle. */
export function applyUpdate(): void {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
  waiting.postMessage({ type: "SKIP_WAITING" });
}

function watch(registration: ServiceWorkerRegistration) {
  // Sem controlador = primeira instalação: ela assume sozinha, sem aviso.
  if (registration.waiting && navigator.serviceWorker.controller) {
    setWaiting(registration.waiting);
  }
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    worker?.addEventListener("statechange", () => {
      if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
    });
  });
}

/** Registra o service worker só no build de produção (no `next dev` ele atrapalharia o recarregamento). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(watch)
      .catch(() => {
        // Sem service worker o jogo funciona normalmente, só não abre offline.
      });
  }, []);
  return null;
}
