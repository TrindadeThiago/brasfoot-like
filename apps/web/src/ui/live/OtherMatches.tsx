"use client";

import { memo } from "react";
import type { OtherMatchRow } from "../../game/live-view";
import { useT } from "../../i18n";
import styles from "./OtherMatches.module.css";

const Row = memo(
  function Row({ row }: { row: OtherMatchRow }) {
    const t = useT();
    return (
      <>
        <span className={styles.competition}>{row.competition}</span>
        <span className={styles.minute}>{row.minute}</span>
        <span className={styles.home}>{row.home.name}</span>
        <strong className={row.recent ? `${styles.score} ${styles.recent}` : styles.score}>
          {row.score.home} × {row.score.away}
        </strong>
        <span className={styles.away}>{row.away.name}</span>
        {row.recent ? (
          <span className={styles.goal}>
            <span aria-hidden="true">● </span>
            {t("live.recentGoal")}
          </span>
        ) : null}
      </>
    );
  },
  (a, b) =>
    a.row.minute === b.row.minute &&
    a.row.score.home === b.row.score.home &&
    a.row.score.away === b.row.score.away &&
    a.row.recent === b.row.recent &&
    a.row.competition === b.row.competition,
);

/** Os outros jogos da rodada em lista, uma linha por jogo (030 R5); o gol recente vem com texto. */
export function OtherMatches({ rows }: { rows: readonly OtherMatchRow[] }) {
  const t = useT();
  return (
    <section aria-label={t("round.otherMatches")} className={styles.panel}>
      <h2 className={styles.title}>{t("round.otherMatches")}</h2>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.key} className={styles.item}>
            <Row row={row} />
          </li>
        ))}
      </ul>
    </section>
  );
}
