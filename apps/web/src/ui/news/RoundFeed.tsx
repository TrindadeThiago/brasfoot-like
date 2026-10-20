"use client";

import type { Headline as HeadlineData } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Headline } from "./Headline";
import styles from "./news.module.css";

/** Lista de manchetes de uma rodada (as mais relevantes primeiro). */
export function RoundFeed({
  save,
  headlines,
  limit,
}: {
  save: SaveFile;
  headlines: readonly HeadlineData[];
  limit?: number;
}) {
  const t = useT();
  if (headlines.length === 0) return <p className={styles.empty}>{t("news.empty")}</p>;
  return (
    <ul className={styles.list}>
      {headlines.slice(0, limit ?? headlines.length).map((headline) => (
        <Headline key={headline.id} save={save} headline={headline} />
      ))}
    </ul>
  );
}
