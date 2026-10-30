"use client";

import { latestFeed } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import {
  filterHeadlines,
  groupHeadlines,
  type NewsFilter,
  roundNav,
} from "../../../game/news-view";
import { useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { EmptyState } from "../../../ui/EmptyState";
import { NewsFilters } from "../../../ui/news/NewsFilters";
import { NewsGroup } from "../../../ui/news/NewsGroup";
import styles from "../../../ui/news/news.module.css";

/** Chave de uma rodada guardada no feed. */
function keyOf(entry: { season: number; round: number }): string {
  return `${entry.season}:${entry.round}`;
}

/**
 * Notícias (029): manchetes de qualquer rodada guardada, cada uma num cartão, agrupadas em "Do seu
 * clube" e por competição, com setas de rodada e um painel de filtros.
 */
function News({ save }: { save: SaveFile }) {
  const t = useT();
  const rounds = [...save.news.feed].reverse();
  const latest = latestFeed(save.news);
  const [selected, setSelected] = useState(latest ? keyOf(latest) : "");
  const [filter, setFilter] = useState<NewsFilter>({ scope: "all" });
  const current = rounds.find((entry) => keyOf(entry) === selected) ?? rounds[0];
  const label = (entry: (typeof rounds)[number]) =>
    `${t("news.season", { year: entry.year })} · ${
      entry.round === 0 ? t("news.summaryRound") : t("news.round", { round: entry.round })
    }`;
  if (!current) {
    return (
      <div className={styles.layout}>
        <h2 className="screen-title">{t("news.page")}</h2>
        <EmptyState title={t("news.empty")} />
      </div>
    );
  }
  const nav = roundNav(save.news.feed, current);
  const all = groupHeadlines(save, current.headlines);
  const shown = filterHeadlines(save, current.headlines, filter);
  // Com um filtro ativo a lista tem uma só seção; sem filtro, "Do seu clube" e as competições.
  const groups = groupHeadlines(save, shown).filter((group) => {
    if (filter.competition !== undefined) return group.kind !== "mine";
    if (filter.scope === "mine") return group.kind === "mine";
    return true;
  });
  const go = (entry: (typeof rounds)[number] | undefined) => {
    if (entry) setSelected(keyOf(entry));
  };
  return (
    <div className={styles.layout}>
      <h2 className="screen-title">{t("news.page")}</h2>
      <div className={styles.toolbar}>
        <Button disabled={!nav.previous} onClick={() => go(nav.previous)}>
          {t("news.prev")}
        </Button>
        <label className={styles.toolbar}>
          <span>{t("news.select")}</span>
          <select value={keyOf(current)} onChange={(event) => setSelected(event.target.value)}>
            {rounds.map((entry) => (
              <option key={keyOf(entry)} value={keyOf(entry)}>
                {label(entry)}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={!nav.next} onClick={() => go(nav.next)}>
          {t("news.next")}
        </Button>
      </div>
      {current.headlines.length === 0 ? (
        <EmptyState title={t("news.empty")} />
      ) : (
        <div className={styles.body}>
          <NewsFilters
            save={save}
            groups={all}
            total={current.headlines.length}
            mine={current.headlines.filter((headline) => headline.mine).length}
            filter={filter}
            onChange={setFilter}
          />
          <div className={styles.sections}>
            {shown.length === 0 ? (
              <EmptyState title={t("news.filter.noMatch")}>
                <Button onClick={() => setFilter({ scope: "all" })}>
                  {t("news.filter.clear")}
                </Button>
              </EmptyState>
            ) : (
              groups.map((group) => (
                <NewsGroup key={group.id} save={save} group={group} round={current.round} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewsPage() {
  return <GameLayout>{(save) => <News save={save} />}</GameLayout>;
}
