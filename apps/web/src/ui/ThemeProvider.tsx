"use client";

import { useEffect } from "react";
import type { Theme } from "../storage/preferences";
import { usePreferences } from "../storage/usePreferences";

const LIGHT_QUERY = "(prefers-color-scheme: light)";

/** Tema efetivo: o escolhido, ou o do sistema em "seguir o sistema" (016). */
export function resolveTheme(theme: Theme, systemLight: boolean): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  return systemLight ? "light" : "dark";
}

/**
 * Script inline do `<head>`: aplica o tema antes da primeira pintura (sem piscar). Lê a mesma
 * chave das preferências; qualquer erro cai no tema escuro.
 */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;try{var p=JSON.parse(localStorage.getItem("brasfoot-like:preferences")||"{}");var t=p&&p.theme;if(t!=="light"&&t!=="dark"){t=matchMedia("${LIGHT_QUERY}").matches?"light":"dark"}d.dataset.theme=t}catch(e){d.dataset.theme="dark"}})()`;

/** Mantém `data-theme` em dia com a preferência e, em "sistema", com o sistema operacional. */
export function ThemeSync() {
  const theme = usePreferences().theme ?? "system";
  useEffect(() => {
    const media = globalThis.matchMedia?.(LIGHT_QUERY);
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(theme, media?.matches ?? false);
    };
    apply();
    if (theme !== "system" || !media) return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return null;
}
