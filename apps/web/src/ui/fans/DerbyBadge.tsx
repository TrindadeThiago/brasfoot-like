"use client";

import { type Rivalry, rivalryOf } from "@brasfoot-like/engine";
import { useT } from "../../i18n";
import styles from "./fans.module.css";

/** Selo "Clássico" de um jogo entre rivais, com a intensidade no rótulo acessível (013 FR-012). */
export function DerbyBadge({
  rivalries,
  home,
  away,
}: {
  rivalries: readonly Rivalry[] | undefined;
  home: string;
  away: string;
}) {
  const t = useT();
  const rivalry = rivalryOf({ rivalries: rivalries ? [...rivalries] : [] }, home, away);
  if (!rivalry) return null;
  return (
    <span
      role="img"
      className={`${styles.derby} ${rivalry.intensity === 3 ? styles.biggest : ""}`}
      title={t("derby.label", { intensity: t(`fans.intensity.${rivalry.intensity}`) })}
      aria-label={t("derby.label", { intensity: t(`fans.intensity.${rivalry.intensity}`) })}
    >
      {t("derby.badge")}
    </span>
  );
}
