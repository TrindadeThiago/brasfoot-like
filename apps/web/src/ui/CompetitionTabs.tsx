"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "../i18n";
import { screenHref } from "./AppHeader";
import styles from "./CompetitionTabs.module.css";

const TABS = [
  { path: "/jogo/competicao", key: "competition.tab.standings" },
  { path: "/jogo/competicao/resultados", key: "competition.tab.results" },
  { path: "/jogo/competicao/artilharia", key: "competition.tab.scorers" },
] as const;

/** Abas da competição: classificação, resultados e artilharia. */
export function CompetitionTabs({ careerId }: { careerId: string }) {
  const t = useT();
  const pathname = (usePathname() ?? "").replace(/\/$/, "");
  return (
    <nav aria-label={t("competition.tabs")} className={styles.tabs}>
      {TABS.map((tab) => (
        <Link
          key={tab.path}
          href={screenHref(tab.path, careerId)}
          aria-current={pathname === tab.path ? "page" : undefined}
          className={pathname === tab.path ? styles.active : undefined}
        >
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}
