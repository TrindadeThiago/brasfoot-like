"use client";

import { leagueRound } from "@brasfoot-like/engine";
import { isEmployed, type SaveFile } from "@brasfoot-like/save";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useMemo } from "react";
import { useT } from "../i18n";
import { type RoundMode, readPreferences } from "../storage/preferences";
import { AssetsProvider } from "../ui/AssetsProvider";
import { ConflictDialog } from "../ui/ConflictDialog";
import { confirmLeave } from "../ui/leave-guard";
import { SimulateDialogs } from "../ui/SimulateDialogs";
import { FocusScreen } from "../ui/shell/FocusScreen";
import { ScreenHeader } from "../ui/shell/ScreenHeader";
import { Sidebar } from "../ui/shell/Sidebar";
import { GAME_SCREENS, isFocusPath, screenHref } from "../ui/shell/screens";
import { type ShortcutId, screenOf } from "../ui/shortcuts";
import { TipHost } from "../ui/tips/TipHost";
import { useShortcuts } from "../ui/useShortcuts";
import styles from "./GameLayout.module.css";
import type { useGame } from "./GameProvider";
import { useCareerFromQuery } from "./useCareerFromQuery";

/** A rota é uma tela do clube (Elenco, Escalação, Finanças, Mercado). */
function clubOnly(pathname: string): boolean {
  return GAME_SCREENS.some(
    (screen) => screen.club && (pathname === screen.path || pathname.startsWith(`${screen.path}/`)),
  );
}

type Render = (save: SaveFile, game: ReturnType<typeof useGame>) => ReactNode;

function Layout({ children }: { children: Render }) {
  const t = useT();
  const router = useRouter();
  const { save, game } = useCareerFromQuery();
  const pathname = (usePathname() ?? "/jogo").replace(/\/+$/, "") || "/jogo";

  const handlers = useMemo<Partial<Record<ShortcutId, () => void>>>(() => {
    if (!save) return {};
    const go = (index: number) => () => {
      const screen = GAME_SCREENS[index];
      if (!screen || (screen.club && !isEmployed(save))) return;
      if (confirmLeave()) router.push(screenHref(screen.path, save.id));
    };
    const play = async (mode: RoundMode) => {
      if (!confirmLeave()) return;
      const outcome = await game.playRound(mode);
      if (outcome === "live") router.push(screenHref("/jogo/rodada", save.id));
      if (outcome === "finished") router.push(screenHref("/jogo/fim-de-temporada", save.id));
    };
    return {
      "go-home": go(0),
      "go-squad": go(1),
      "go-lineup": go(2),
      "go-competition": go(3),
      "go-calendar": go(4),
      "go-finance": go(5),
      "go-history": go(6),
      "go-market": go(7),
      "go-career": go(8),
      "go-news": go(9),
      play: () => void play(readPreferences().roundMode ?? "live"),
      "play-direct": () => void play("direct"),
    };
  }, [save, router, game]);
  useShortcuts(handlers);

  // Desempregado (012): as telas do clube levam para a Início.
  const blocked = save !== undefined && !isEmployed(save) && clubOnly(pathname);
  useEffect(() => {
    if (blocked && save) router.replace(screenHref("/jogo", save.id));
  }, [blocked, save, router]);

  if (game.state.status === "error" && game.state.error) {
    return (
      <main className={styles.message} role="alert">
        {t(game.state.error)}
      </main>
    );
  }
  if (!save) return <main className={styles.message}>{t("common.loading")}</main>;
  if (blocked) return <main className={styles.message}>{t("common.loading")}</main>;
  return (
    <AssetsProvider assets={save.assets}>
      {isFocusPath(pathname) ? (
        // Tela de foco (025 FR-008): sem barra lateral, com o jeito de voltar ao Início.
        <div className={styles.focus}>
          <ScreenHeader save={save} />
          <FocusScreen back={{ href: screenHref("/jogo", save.id), label: t("nav.home") }}>
            <main>{children(save, game)}</main>
          </FocusScreen>
        </div>
      ) : (
        <div className={styles.shell}>
          <Sidebar save={save} />
          <div className={styles.column}>
            <ScreenHeader save={save} />
            <main className={styles.content}>{children(save, game)}</main>
          </div>
        </div>
      )}
      <ConflictDialog />
      <SimulateDialogs save={save} game={game} />
      <TipHost
        screen={screenOf(pathname)}
        context={{ played: save.history.length > 0 || leagueRound(save.league) > 1 }}
      />
    </AssetsProvider>
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
