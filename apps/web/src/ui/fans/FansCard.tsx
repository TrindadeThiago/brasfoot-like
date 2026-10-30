"use client";

import { fansRules, moodBand } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { reasonsOf, TREND_SYMBOL, trendOf } from "../../game/board-view";
import { useT } from "../../i18n";
import { Card } from "../Card";
import { Meter } from "../Meter";
import styles from "./fans.module.css";

/**
 * Humor da torcida do clube (029): valor, barra com a faixa em texto, tendência em texto e símbolo
 * e os motivos recentes com o efeito de cada um (013 FR-016).
 */
export function FansCard({ save, clubId }: { save: SaveFile; clubId: string }) {
  const t = useT();
  const club = save.fans.clubs[clubId];
  if (!club) return null;
  const rules = fansRules(save.bank, save.league.competitionId);
  const band = moodBand(rules, club.mood);
  const trend = trendOf(club.recent);
  const factors = reasonsOf(club.recent, 3);
  return (
    <Card aria-label={t("fans.title")} className={styles.card}>
      <h2>{t("fans.title")}</h2>
      <div className={styles.row}>
        <span className={styles.value}>{club.mood}</span>
        <Meter
          value={club.mood}
          label={t("fans.mood", { value: club.mood })}
          text={t(`fans.band.${band}`)}
          tone={
            band === "furious" || band === "unhappy"
              ? "danger"
              : band === "neutral"
                ? "warning"
                : "accent"
          }
        />
        <span
          className={trend === "up" ? styles.up : trend === "down" ? styles.down : styles.muted}
        >
          <span aria-hidden="true">{TREND_SYMBOL[trend]} </span>
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
    </Card>
  );
}
