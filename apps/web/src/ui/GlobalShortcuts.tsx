"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { confirmLeave } from "./leave-guard";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { screenOf } from "./shortcuts";
import { useShortcuts } from "./useShortcuts";

const OpenHelp = createContext<() => void>(() => {});

/** Abre a ajuda de atalhos (botões "Atalhos" da inicial e do cabeçalho do jogo). */
export function useOpenShortcutsHelp(): () => void {
  return useContext(OpenHelp);
}

/**
 * Atalhos gerais de todas as telas (016 US3): `?` abre a ajuda da tela atual e `,` abre as
 * configurações. Montado uma vez no layout raiz.
 */
export function GlobalShortcuts({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const screen = screenOf(pathname);
  const [open, setOpen] = useState(false);
  const openHelp = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const handlers = useMemo(
    () => ({
      help: () => setOpen((current) => !current),
      settings: () => {
        if (screen !== "settings" && confirmLeave()) router.push("/configuracoes/");
      },
    }),
    [screen, router],
  );
  useShortcuts(handlers);

  return (
    <OpenHelp.Provider value={openHelp}>
      {children}
      <ShortcutsHelp open={open} screen={screen} onClose={close} />
    </OpenHelp.Provider>
  );
}
