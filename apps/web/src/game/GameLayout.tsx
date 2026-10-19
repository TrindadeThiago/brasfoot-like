"use client";

import { leagueRound, leagueTotalRounds } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useRouter } from "next/navigation";
import { type ReactNode, Suspense, useMemo, useState } from "react";
import { useT } from "../i18n";
import { type RoundMode, readPreferences } from "../storage/preferences";
import { AppHeader, GAME_SCREENS, screenHref } from "../ui/AppHeader";
import { ConflictDialog } from "../ui/ConflictDialog";
import { confirmLeave } from "../ui/leave-guard";
import { ShortcutsHelp } from "../ui/ShortcutsHelp";
import { SimulateDialogs } from "../ui/SimulateDialogs";
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
      if (screen && confirmLeave()) router.push(screenHref(screen.path, save.id));
    };
    const play = async (mode: RoundMode) => {
      if (!confirmLeave()) return;
      const last = leagueRound(save.league) === leagueTotalRounds(save.league);
      const outcome = await game.playRound(mode);
      if (outcome === "live") router.push(screenHref("/jogo/rodada", save.id));
      if (outcome === "done" && last) router.push(screenHref("/jogo/fim-de-temporada", save.id));
    };
    return {
      "1": go(0),
      "2": go(1),
      "3": go(2),
      "4": go(3),
      "5": go(4),
      h: go(5),
      s: () => void play(readPreferences().roundMode ?? "live"),
      d: () => void play("direct"),
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
      <SimulateDialogs save={save} game={game} />
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
