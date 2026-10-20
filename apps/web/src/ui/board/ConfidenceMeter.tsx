"use client";

import type { ConfidenceChange } from "@brasfoot-like/engine";
import { useT } from "../../i18n";
import styles from "./board.module.css";

/** Soma das últimas três mudanças: positiva = em alta. */
export function confidenceTrend(recent: readonly ConfidenceChange[]): "up" | "down" | "flat" {
  const sum = recent.slice(-3).reduce((total, change) => total + change.delta, 0);
  return sum > 0 ? "up" : sum < 0 ? "down" : "flat";
}

/** Fatores das mudanças mais recentes (os mais novos primeiro). */
export function recentFactors(recent: readonly ConfidenceChange[], limit: number) {
  return [...recent]
    .reverse()
    .flatMap((change) =>
      change.factors.map((factor, index) => ({ ...factor, id: `${change.round}-${index}` })),
    )
    .slice(0, limit);
}

/** Confiança da diretoria: valor, medidor, tendência e motivos recentes (FR-012, FR-015). */
export function ConfidenceMeter({
  value,
  recent,
}: {
  value: number;
  recent: readonly ConfidenceChange[];
}) {
  const t = useT();
  const trend = confidenceTrend(recent);
  const factors = recentFactors(recent, 3);
  return (
    <div className={styles.meter}>
      <div className={styles.meterRow}>
        <span className={styles.value}>{value}</span>
        <meter
          min={0}
          max={100}
          low={30}
          high={60}
          optimum={100}
          value={value}
          aria-label={t("board.confidence", { value })}
        />
        <span
          className={trend === "up" ? styles.up : trend === "down" ? styles.down : styles.muted}
        >
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
