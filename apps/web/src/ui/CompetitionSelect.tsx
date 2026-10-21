"use client";

import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { competitionHref } from "../game/useDivision";
import { useT } from "../i18n";
import styles from "./CompetitionTabs.module.css";

/**
 * Abas das competições do banco (017 FR-037): só aparecem quando há mais de uma. Escolher uma
 * leva à mesma tela daquela competição, com a divisão do clube (ou a primeira).
 */
export function CompetitionSelect({
  save,
  competitionId,
}: {
  save: SaveFile;
  competitionId: string;
}) {
  const t = useT();
  const pathname = (usePathname() ?? "/jogo/competicao").replace(/\/+$/, "");
  const competitions = save.bank.competitions;
  if (competitions.length < 2) return null;
  return (
    <nav aria-label={t("competition.select")} className={styles.tabs}>
      {competitions.map((competition) => (
        <Link
          key={competition.id}
          href={competitionHref(pathname, save.id, competition.id)}
          aria-current={competition.id === competitionId ? "page" : undefined}
          className={competition.id === competitionId ? styles.active : undefined}
        >
          {competition.name}
        </Link>
      ))}
    </nav>
  );
}
