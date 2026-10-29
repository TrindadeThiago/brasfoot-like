"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useId } from "react";
import type { NewsGroup as Group } from "../../game/news-view";
import { useT } from "../../i18n";
import { HeadlineCard } from "./HeadlineCard";
import styles from "./news.module.css";

/** Seção de manchetes (029): "Do seu clube", uma competição ou "Geral", com a contagem no título. */
export function NewsGroup({ save, group, round }: { save: SaveFile; group: Group; round: number }) {
  const t = useT();
  const titleId = useId();
  const name =
    group.kind === "mine"
      ? t("news.group.mine")
      : group.kind === "general"
        ? t("news.group.general")
        : (save.bank.competitions.find((entry) => entry.id === group.id)?.name ?? group.id);
  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className={styles.sectionTitle}>
        {name}
        <span className={styles.count}>
          {t("news.group.count", { count: group.headlines.length })}
        </span>
      </h2>
      <ul className={styles.list}>
        {group.headlines.map((headline) => (
          <li key={headline.id}>
            <HeadlineCard save={save} headline={headline} round={round} />
          </li>
        ))}
      </ul>
    </section>
  );
}
