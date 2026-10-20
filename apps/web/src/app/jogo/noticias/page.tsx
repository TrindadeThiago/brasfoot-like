"use client";

import { latestFeed } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import { useT } from "../../../i18n";
import styles from "../../../ui/news/news.module.css";
import { RoundFeed } from "../../../ui/news/RoundFeed";

/** Chave de uma rodada guardada no feed. */
function keyOf(entry: { season: number; round: number }): string {
  return `${entry.season}:${entry.round}`;
}

/** Notícias: manchetes de qualquer rodada guardada (temporada atual e anterior) e o resumo. */
function News({ save }: { save: SaveFile }) {
  const t = useT();
  const rounds = [...save.news.feed].reverse();
  const latest = latestFeed(save.news);
  const [selected, setSelected] = useState(latest ? keyOf(latest) : "");
  const current = rounds.find((entry) => keyOf(entry) === selected) ?? rounds[0];
  const label = (entry: (typeof rounds)[number]) =>
    `${t("news.season", { year: entry.year })} · ${
      entry.round === 0 ? t("news.summaryRound") : t("news.round", { round: entry.round })
    }`;
  return (
    <div className={styles.layout}>
      <h1>{t("news.page")}</h1>
      {rounds.length === 0 ? (
        <p className={styles.empty}>{t("news.empty")}</p>
      ) : (
        <>
          <label className={styles.toolbar}>
            <span>{t("news.select")}</span>
            <select
              value={current ? keyOf(current) : ""}
              onChange={(event) => setSelected(event.target.value)}
            >
              {rounds.map((entry) => (
                <option key={keyOf(entry)} value={keyOf(entry)}>
                  {label(entry)}
                </option>
              ))}
            </select>
          </label>
          {current ? (
            <section aria-label={label(current)} className={styles.card}>
              <h2>{label(current)}</h2>
              <RoundFeed save={save} headlines={current.headlines} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function NewsPage() {
  return <GameLayout>{(save) => <News save={save} />}</GameLayout>;
}
