"use client";

import type { ConfidenceChange } from "@brasfoot-like/engine";
import { confidenceLevel, reasonsOf, TREND_SYMBOL, trendOf } from "../../game/board-view";
import { useT } from "../../i18n";
import { Meter } from "../Meter";
import styles from "./board.module.css";

/**
 * Confiança da diretoria (029): valor, barra com o nível em texto, tendência em texto e símbolo e
 * os motivos mais recentes com o efeito de cada um (FR-012, FR-015).
 */
export function ConfidenceMeter({
  value,
  recent,
}: {
  value: number;
  recent: readonly ConfidenceChange[];
}) {
  const t = useT();
  const level = confidenceLevel(value);
  const trend = trendOf(recent);
  const factors = reasonsOf(recent, 3);
  return (
    <div className={styles.meter}>
      <div className={styles.meterRow}>
        <span className={styles.value}>{value}</span>
        <Meter
          value={value}
          label={t("board.confidence", { value })}
          text={t("board.level", { level })}
          tone={level === "high" ? "accent" : level === "medium" ? "warning" : "danger"}
        />
        <span
          className={trend === "up" ? styles.up : trend === "down" ? styles.down : styles.muted}
        >
          <span aria-hidden="true">{TREND_SYMBOL[trend]} </span>
          {t(`board.trend.${trend}`)}
        </span>
      </div>
      <h3>{t("board.reasons")}</h3>
      {factors.length === 0 ? (
        <p className={styles.muted}>{t("board.noReasons")}</p>
      ) : (
        <ul className={styles.list}>
          {factors.map((factor) => (
            <li key={factor.id}>{t(`board.factor.${factor.kind}`, { amount: factor.amount })}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
