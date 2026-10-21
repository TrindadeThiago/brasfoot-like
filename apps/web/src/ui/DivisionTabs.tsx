"use client";

import { divisionNameOf, type SaveFile, userDivisionLevel } from "@brasfoot-like/save";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { divisionHref } from "../game/useDivision";
import { useT } from "../i18n";
import styles from "./CompetitionTabs.module.css";
import { useShortcuts } from "./useShortcuts";

/** Uma aba por divisão (nomes do mod), com `[` / `]` para a anterior / seguinte. */
export function DivisionTabs({ save, level }: { save: SaveFile; level: number }) {
  const t = useT();
  const router = useRouter();
  const pathname = (usePathname() ?? "/jogo/competicao").replace(/\/+$/, "");
  const levels = save.league.divisions.map((season) => season.divisionLevel);
  const mine = userDivisionLevel(save);
  const go = (offset: number) => () => {
    const next = levels[levels.indexOf(level) + offset];
    if (next !== undefined) router.push(divisionHref(pathname, save.id, next));
  };
  useShortcuts({ "division-prev": go(-1), "division-next": go(1) });
  return (
    <nav aria-label={t("division.tabs.label")} className={styles.tabs}>
      {levels.map((entry) => {
        const name = divisionNameOf(save, entry);
        return (
          <Link
            key={entry}
            href={divisionHref(pathname, save.id, entry)}
            aria-current={entry === level ? "page" : undefined}
            className={entry === level ? styles.active : undefined}
          >
            {entry === mine ? t("division.mine", { division: name }) : name}
          </Link>
        );
      })}
    </nav>
  );
}
