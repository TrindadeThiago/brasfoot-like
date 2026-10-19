"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { divisionHref } from "../game/useDivision";
import { useT } from "../i18n";
import styles from "./CompetitionTabs.module.css";

const TABS = [
  { path: "/jogo/competicao", key: "competition.tab.standings" },
  { path: "/jogo/competicao/resultados", key: "competition.tab.results" },
  { path: "/jogo/competicao/artilharia", key: "competition.tab.scorers" },
] as const;

/** Abas da competição: classificação, resultados e artilharia, mantendo a divisão escolhida. */
export function CompetitionTabs({ careerId, level }: { careerId: string; level: number }) {
  const t = useT();
  const pathname = (usePathname() ?? "").replace(/\/$/, "");
  return (
    <nav aria-label={t("competition.tabs")} className={styles.tabs}>
      {TABS.map((tab) => (
        <Link
          key={tab.path}
          href={divisionHref(tab.path, careerId, level)}
          aria-current={pathname === tab.path ? "page" : undefined}
          className={pathname === tab.path ? styles.active : undefined}
        >
          {t(tab.key)}
        </Link>
      ))}
    </nav>
  );
}
