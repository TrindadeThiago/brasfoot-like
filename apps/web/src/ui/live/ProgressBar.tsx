"use client";

import type { LiveMatch } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { markersOf, progressOf } from "../../game/live-view";
import { useT } from "../../i18n";
import { clockText, eventText } from "../event-text";
import styles from "./ProgressBar.module.css";

// Gol com a bola; os cartões são retângulos e a lesão, um "+": cada marca tem forma própria.
const SYMBOL = { goal: "⚽", yellow: "", red: "", injury: "+" } as const;

/**
 * Linha do tempo da partida (030): o progresso até o minuto atual, o intervalo marcado e os gols,
 * cartões e lesões no minuto em que aconteceram. Cada marca tem forma própria e, ao passar o mouse,
 * mostra a descrição do lance; a lista de lances abaixo traz os mesmos lances em texto.
 */
export function ProgressBar({ match, save }: { match: LiveMatch; save: SaveFile }) {
  const { state } = match;
  const t = useT();
  const progress = progressOf(state);
  const half = (progress.halftimeAt / progress.total) * 100;
  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <progress
          className={styles.bar}
          max={progress.total}
          value={progress.minute}
          aria-label={t("live.progress")}
          aria-valuetext={clockText(state)}
        />
        <span aria-hidden="true" className={styles.marker} style={{ left: `${half}%` }} />
        {markersOf(state).map((marker) => {
          const description =
            eventText(marker.event, match, save) ??
            t("live.marker.at", {
              kind: t(`live.marker.${marker.kind}`),
              minute: marker.minute,
            });
          const edge = marker.percent < 15 ? styles.left : marker.percent > 85 ? styles.right : "";
          return (
            <span
              key={marker.key}
              aria-hidden="true"
              className={`${styles.event} ${styles[marker.kind]} ${edge}`}
              style={{ left: `${marker.percent}%` }}
            >
              {SYMBOL[marker.kind]}
              <span className={styles.tip}>{description}</span>
            </span>
          );
        })}
      </div>
      <p className={styles.caption}>
        <span>{t("live.progress.start")}</span>
        <span style={{ left: `${half}%` }} className={styles.half}>
          {progress.halftimeAt}'
        </span>
        <span>{progress.total}'</span>
      </p>
    </div>
  );
}
