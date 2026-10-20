"use client";

import { fansRules, type MoodChange, moodBand } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import styles from "./fans.module.css";

/** Soma das últimas três mudanças: positiva = em alta. */
function trendOf(recent: readonly MoodChange[]): "up" | "down" | "flat" {
  const sum = recent.slice(-3).reduce((total, change) => total + change.delta, 0);
  return sum > 0 ? "up" : sum < 0 ? "down" : "flat";
}

/** Humor da torcida do clube: faixa, valor, tendência e motivos recentes (013 FR-016). */
export function FansCard({ save, clubId }: { save: SaveFile; clubId: string }) {
  const t = useT();
  const club = save.fans.clubs[clubId];
  if (!club) return null;
  const rules = fansRules(save.bank, save.league.competitionId);
  const band = moodBand(rules, club.mood);
  const trend = trendOf(club.recent);
  const factors = [...club.recent]
    .reverse()
    .flatMap((change) =>
      change.factors.map((factor, index) => ({ ...factor, id: `${change.round}-${index}` })),
    )
    .slice(0, 3);
  return (
    <section aria-label={t("fans.title")} className={styles.card}>
      <h2>{t("fans.title")}</h2>
      <div className={styles.row}>
        <span className={styles.value}>{club.mood}</span>
        <span className={styles.band}>{t(`fans.band.${band}`)}</span>
        <meter
          min={0}
          max={100}
          low={rules.bands[1]}
          high={rules.bands[2]}
          optimum={100}
          value={club.mood}
          aria-label={t("fans.mood", { value: club.mood })}
        />
        <span
          className={trend === "up" ? styles.up : trend === "down" ? styles.down : styles.muted}
        >
          {t(`fans.trend.${trend}`)}
        </span>
      </div>
      <h3>{t("fans.reasons")}</h3>
      {factors.length === 0 ? (
        <p className={styles.muted}>{t("fans.noReasons")}</p>
      ) : (
        <ul className={styles.list}>
          {factors.map((factor) => (
            <li key={factor.id}>{t(`fans.factor.${factor.kind}`, { amount: factor.amount })}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
