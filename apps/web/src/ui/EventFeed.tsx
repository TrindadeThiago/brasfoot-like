"use client";

import type { LiveRound } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { tagOf } from "../game/live-view";
import type { FeedItem } from "../game/useLiveRound";
import { useT } from "../i18n";
import { Badge, type BadgeTone } from "./Badge";
import styles from "./EventFeed.module.css";
import { eventText, minuteText } from "./event-text";

const TAG_TONE: Record<string, BadgeTone> = {
  goal: "accent",
  card: "warning",
  injury: "danger",
  penalty: "info",
  shootout: "info",
  extra: "info",
};

/** Quantos lances a linha do tempo mostra na tela (030 R4). */
export const TIMELINE_LIMIT = 60;

/**
 * Linha do tempo do meu jogo (030): lances narrados em texto, os mais recentes primeiro, num quadro
 * com nome e foco por teclado. Os anúncios para leitor de tela vêm de outra região, então o `log`
 * não é ao vivo (`aria-live="off"`), para não repetir cada lance.
 */
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
  const t = useT();
  const lines = items
    .map((item) => {
      const match = live.matches[item.matchIndex];
      const text = match ? eventText(item.event, match, save) : undefined;
      if (!text) return undefined;
      const tag = tagOf(item.event);
      return {
        key: item.key,
        // O minuto vai na própria coluna: tira o que a frase narrada já traz no começo.
        text: text.replace(/^\d+(\+\d+)?'\s*[-–:]?\s*/, ""),
        minute: minuteText(item.event),
        tag,
        mine: item.mine,
      };
    })
    .filter((line) => line !== undefined)
    .slice(0, TIMELINE_LIMIT);
  return (
    <section className={styles.feed}>
      <h2>{title}</h2>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: quadro rolante: quem usa só o teclado precisa rolar a lista */}
      <div role="log" aria-live="off" aria-label={title} tabIndex={0} className={styles.scroller}>
        <ul>
          {lines.length === 0 ? <li>{t("live.timeline.empty")}</li> : null}
          {lines.map((line) => (
            <li key={line.key} className={styles.line}>
              <span className={styles.minute}>{line.minute}</span>
              <Badge tone={TAG_TONE[line.tag] ?? "neutral"}>{t(`live.tag.${line.tag}`)}</Badge>
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
