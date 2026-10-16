"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useRouter } from "next/navigation";
import { type ReactNode, Suspense, useMemo, useState } from "react";
import { useT } from "../i18n";
import { AppHeader, GAME_SCREENS, screenHref } from "../ui/AppHeader";
import { ConflictDialog } from "../ui/ConflictDialog";
import { ShortcutsHelp } from "../ui/ShortcutsHelp";
import { useShortcuts } from "../ui/useShortcuts";
import styles from "./GameLayout.module.css";
import type { useGame } from "./GameProvider";
import { useCareerFromQuery } from "./useCareerFromQuery";

type Render = (save: SaveFile, game: ReturnType<typeof useGame>) => ReactNode;

function Layout({ children }: { children: Render }) {
  const t = useT();
  const router = useRouter();
  const { save, game } = useCareerFromQuery();
  const [help, setHelp] = useState(false);

  const handlers = useMemo<Record<string, () => void>>(() => {
    if (!save) return {};
    const go = (index: number) => () => {
      const screen = GAME_SCREENS[index];
      if (screen) router.push(screenHref(screen.path, save.id));
    };
    return {
      "1": go(0),
      "2": go(1),
      "3": go(2),
      "4": go(3),
      s: () => void game.simulateNextRound(),
      "?": () => setHelp((open) => !open),
    };
  }, [save, router, game]);
  useShortcuts(handlers);

  if (game.state.status === "error" && game.state.error) {
    return (
      <main className={styles.message} role="alert">
        {t(game.state.error)}
      </main>
    );
  }
  if (!save) return <main className={styles.message}>{t("common.loading")}</main>;
  return (
    <>
      <AppHeader save={save} onHelp={() => setHelp(true)} />
      <main className={styles.content}>{children(save, game)}</main>
      <ConflictDialog />
      <ShortcutsHelp open={help} onClose={() => setHelp(false)} />
    </>
  );
}

/** Estrutura comum das telas do jogo: carrega a carreira de `?c=`, cabeçalho, atalhos e diálogos. */
export function GameLayout({ children }: { children: Render }) {
  return (
    <Suspense>
      <Layout>{children}</Layout>
    </Suspense>
  );
}
