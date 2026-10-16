"use client";

import type { LiveRound } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import type { FeedItem } from "../game/useLiveRound";
import styles from "./EventFeed.module.css";
import { eventText } from "./event-text";

/** Lances narrados em texto, mais recentes primeiro (`role="log"`). */
export function EventFeed({
  title,
  items,
  live,
  save,
}: {
  title: string;
  items: readonly FeedItem[];
  live: LiveRound;
  save: SaveFile;
}) {
  const lines = items
    .map((item) => {
      const match = live.matches[item.matchIndex];
      const text = match ? eventText(item.event, match, save) : undefined;
      return text ? { key: item.key, text, mine: item.mine } : undefined;
    })
    .filter((line) => line !== undefined);
  return (
    <section className={styles.feed}>
      <h2>{title}</h2>
      <ul role="log" aria-label={title}>
        {lines.map((line) => (
          <li key={line.key} className={line.mine ? styles.mine : ""}>
            {line.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
