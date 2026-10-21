"use client";

import type { MatchRecord, TeamStats } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import { Crest } from "./Crest";
import { ShootoutPanel } from "./cup/ShootoutPanel";
import { minuteText } from "./event-text";
import styles from "./MatchSummary.module.css";

const STATS: readonly (keyof TeamStats)[] = [
  "shots",
  "shotsOnTarget",
  "possession",
  "yellowCards",
  "redCards",
  "penalties",
];

/** Resumo de uma partida a partir do registro da temporada (FR-015). */
export function MatchSummary({ record, save }: { record: MatchRecord; save: SaveFile }) {
  const t = useT();
  const players = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const name = (id: string | undefined) => (id ? (players.get(id) ?? id) : "");
  const home = clubs.get(record.home);
  const away = clubs.get(record.away);
  const sideName = (side: "home" | "away") => (side === "home" ? home?.shortName : away?.shortName);
  const title = t("summary.title", {
    home: home?.name ?? record.home,
    away: away?.name ?? record.away,
    homeScore: record.score.home,
    awayScore: record.score.away,
  });

  const goals: string[] = [];
  const cards: string[] = [];
  const injuries: string[] = [];
  const substitutions: string[] = [];
  for (const event of record.events) {
    const minute = minuteText(event);
    if (event.type === "shot" && event.outcome === "goal") {
      goals.push(
        `${t("summary.goal", {
          minute,
          player: name(event.playerId),
          penalty: event.kind === "penalty" ? "yes" : "no",
          assist: event.assistId ? name(event.assistId) : "none",
        })} (${sideName(event.side)})`,
      );
    } else if (event.type === "yellow_card") {
      cards.push(
        `${t("summary.yellow", { minute, player: name(event.playerId) })} (${sideName(event.side)})`,
      );
    } else if (event.type === "red_card") {
      cards.push(
        `${t("summary.red", { minute, player: name(event.playerId) })} (${sideName(event.side)})`,
      );
    } else if (event.type === "injury") {
      injuries.push(
        `${t("summary.injury", { minute, player: name(event.playerId) })} (${sideName(event.side)})`,
      );
    } else if (event.type === "substitution") {
      substitutions.push(
        `${t("summary.substitution", {
          minute,
          out: name(event.outId),
          in: name(event.inId),
          automatic: event.automatic ? "yes" : "no",
        })} (${sideName(event.side)})`,
      );
    }
  }

  const value = (stats: TeamStats, key: keyof TeamStats) => {
    if (key === "possession") return t("summary.possessionValue", { value: stats.possession });
    if (key === "penalties")
      return t("summary.penaltiesValue", { scored: stats.penaltiesScored, total: stats.penalties });
    return String(stats[key]);
  };

  const section = (key: string, lines: string[]) => (
    <section aria-label={t(key)} className={styles.section}>
      <h3>{t(key)}</h3>
      {lines.length === 0 ? (
        <p className={styles.none}>{t("summary.none")}</p>
      ) : (
        <ul>
          {lines.map((line, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: linhas do resumo em ordem fixa
            <li key={index}>{line}</li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <article aria-label={title} className={styles.summary}>
      <header className={styles.header}>
        {home ? <Crest crest={home.crest} label={home.name} size={36} /> : null}
        <h2>{title}</h2>
        {away ? <Crest crest={away.crest} label={away.name} size={36} /> : null}
      </header>
      <div className={styles.columns}>
        <div>
          {section("summary.goals", goals)}
          {section("summary.cards", cards)}
          {section("summary.injuries", injuries)}
          {section("summary.substitutions", substitutions)}
        </div>
        <table className={styles.stats}>
          <caption>{t("summary.stats")}</caption>
          <thead>
            <tr>
              <th scope="col">{home?.shortName}</th>
              <th scope="col" />
              <th scope="col">{away?.shortName}</th>
            </tr>
          </thead>
          <tbody>
            {STATS.map((key) => (
              <tr key={key}>
                <td>{value(record.stats.home, key)}</td>
                <th scope="row">{t(`summary.stat.${key}`)}</th>
                <td>{value(record.stats.away, key)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {record.decision?.extraTimeScore ? (
        <p className={styles.none}>
          {t("cup.extraTimeGoals")}: {record.decision.extraTimeScore.home} ×{" "}
          {record.decision.extraTimeScore.away}
        </p>
      ) : record.decision?.shootout ? (
        <p className={styles.none}>{t("cup.extraTime")}</p>
      ) : null}
      {record.decision?.shootout ? (
        <ShootoutPanel
          save={save}
          home={record.home}
          away={record.away}
          kicks={record.decision.shootout.kicks}
          score={record.decision.shootout.score}
        />
      ) : null}
    </article>
  );
}
