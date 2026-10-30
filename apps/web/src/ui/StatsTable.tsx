"use client";

import type { TeamStats } from "@brasfoot-like/engine";
import { useT } from "../i18n";
import styles from "./StatsTable.module.css";

/** Barra dividida entre os dois times, proporcional ao valor de cada um; decorativa (os números estão ao lado). */
function Bar({ home, away }: { home: number; away: number }) {
  const total = home + away;
  return (
    <span aria-hidden="true" className={styles.bar}>
      {total > 0 ? (
        <>
          <span className={styles.home} style={{ width: `${(home / total) * 100}%` }} />
          <span className={styles.away} style={{ width: `${(away / total) * 100}%` }} />
        </>
      ) : null}
    </span>
  );
}

const STATS: readonly (keyof TeamStats)[] = [
  "shots",
  "shotsOnTarget",
  "possession",
  "yellowCards",
  "redCards",
  "penalties",
];

/** Estatísticas dos dois times lado a lado (resumo da partida e acompanhamento ao vivo). */
export function StatsTable({
  home,
  away,
  stats,
  bars = false,
}: {
  home: string | undefined;
  away: string | undefined;
  stats: { home: TeamStats; away: TeamStats };
  /** Barras comparativas entre os dois times, sob cada rótulo (030); os números continuam na tabela. */
  bars?: boolean;
}) {
  const t = useT();
  const value = (team: TeamStats, key: keyof TeamStats) => {
    if (key === "possession") return t("summary.possessionValue", { value: team.possession });
    if (key === "penalties")
      return t("summary.penaltiesValue", { scored: team.penaltiesScored, total: team.penalties });
    return String(team[key]);
  };
  return (
    <table className={styles.stats}>
      <caption>{t("summary.stats")}</caption>
      <thead>
        <tr>
          <th scope="col">{home}</th>
          <th scope="col" />
          <th scope="col">{away}</th>
        </tr>
      </thead>
      <tbody>
        {STATS.map((key) => (
          <tr key={key}>
            <td>{value(stats.home, key)}</td>
            <th scope="row">
              {t(`summary.stat.${key}`)}
              {bars ? <Bar home={stats.home[key]} away={stats.away[key]} /> : null}
            </th>
            <td>{value(stats.away, key)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
