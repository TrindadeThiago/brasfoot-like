"use client";

import { isSeasonOver } from "@brasfoot-like/engine";
import { type SaveFile, seasonYearOf } from "@brasfoot-like/save";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../i18n";
import styles from "./AppHeader.module.css";
import { Button } from "./Button";
import { Crest } from "./Crest";
import { SaveIndicator } from "./SaveIndicator";

export const GAME_SCREENS = [
  { path: "/jogo", key: "nav.home" },
  { path: "/jogo/elenco", key: "nav.squad" },
  { path: "/jogo/escalacao", key: "nav.lineup" },
  { path: "/jogo/competicao", key: "nav.competition" },
  { path: "/jogo/calendario", key: "nav.calendar" },
] as const;

export function screenHref(path: string, careerId: string): string {
  return `${path}/?c=${careerId}`;
}

/** Cabeçalho sempre visível do jogo: clube, técnico, temporada, navegação e salvamento (FR-015). */
export function AppHeader({ save, onHelp }: { save: SaveFile; onHelp: () => void }) {
  const t = useT();
  const pathname = (usePathname() ?? "/jogo").replace(/\/+$/, "") || "/jogo";
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const year = seasonYearOf(save);
  const total = save.season.calendar.length;
  return (
    <header className={styles.header}>
      <div className={styles.club}>
        {club ? <Crest crest={club.crest} label={club.name} size={44} /> : null}
        <div>
          <h1 className={styles.name}>{club?.name}</h1>
          <p className={styles.meta}>
            <span>{t("header.manager", { name: save.managerName })}</span>
            <span>
              {isSeasonOver(save.season)
                ? t("header.seasonOver", { year })
                : t("header.progress", { year, round: save.season.nextRound, total })}
            </span>
          </p>
        </div>
      </div>
      <nav aria-label={t("nav.menu")} className={styles.nav}>
        {GAME_SCREENS.map((screen) => (
          <Link
            key={screen.path}
            href={screenHref(screen.path, save.id)}
            aria-current={pathname === screen.path ? "page" : undefined}
            className={pathname === screen.path ? styles.active : undefined}
          >
            {t(screen.key)}
          </Link>
        ))}
      </nav>
      <div className={styles.tools}>
        <SaveIndicator />
        <Button onClick={onHelp}>{t("nav.help")}</Button>
      </div>
    </header>
  );
}
