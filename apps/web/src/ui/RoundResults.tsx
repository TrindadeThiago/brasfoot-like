"use client";

import type { Club, MatchRecord, Rivalry } from "@brasfoot-like/engine";
import { useT } from "../i18n";
import { Crest } from "./Crest";
import { DerbyBadge } from "./fans/DerbyBadge";
import styles from "./RoundResults.module.css";

interface RoundResultsProps {
  round: number;
  records: readonly MatchRecord[];
  clubs: readonly Club[];
  /** Clube do jogador, destacado. */
  clubId: string;
  /** Rivalidades do banco, para marcar os clássicos (013). */
  rivalries?: readonly Rivalry[] | undefined;
}

/** Resultados dos jogos de uma rodada. */
export function RoundResults({ round, records, clubs, clubId, rivalries }: RoundResultsProps) {
  const t = useT();
  const byId = new Map(clubs.map((club) => [club.id, club]));
  const title = t("home.lastRound", { round });
  return (
    <section aria-label={title} className={styles.section}>
      <h2>{title}</h2>
      <ul className={styles.list}>
        {records.map((record) => {
          const home = byId.get(record.home);
          const away = byId.get(record.away);
          const mine = record.home === clubId || record.away === clubId;
          return (
            <li
              key={`${record.home}-${record.away}`}
              aria-current={mine ? "true" : undefined}
              className={mine ? styles.mine : undefined}
            >
              <span className={styles.team}>
                {home?.shortName}
                {home ? <Crest crest={home.crest} label={home.name} size={20} /> : null}
              </span>
              <span className={styles.score}>
                {record.score.home} × {record.score.away}
              </span>
              {/* O selo fica na célula do visitante: a linha mantém 3 colunas e o placar centrado. */}
              <span className={`${styles.team} ${styles.away}`}>
                {away ? <Crest crest={away.crest} label={away.name} size={20} /> : null}
                {away?.shortName}
                <DerbyBadge rivalries={rivalries} home={record.home} away={record.away} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
