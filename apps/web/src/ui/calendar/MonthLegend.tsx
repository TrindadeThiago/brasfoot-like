"use client";

import { useT } from "../../i18n";
import styles from "./MonthLegend.module.css";

/**
 * Legenda do calendário (027): o que cada faixa de cor significa. Resultados (V/E/D) para os jogos
 * disputados, uma cor por competição para os futuros e a marca do próximo jogo. A cor é reforço:
 * cada item traz o nome em texto.
 */
export function MonthLegend({
  competitions,
}: {
  /** As competições do calendário, na ordem usada para colorir (a mesma da grade). */
  competitions: readonly { id: string; name: string }[];
}) {
  const t = useT();
  return (
    <section aria-label={t("calendar.legend")} className={styles.legend}>
      <h2 className="visually-hidden">{t("calendar.legend")}</h2>
      <ul className={styles.list}>
        <li>
          <span className={`${styles.swatch} ${styles.win}`} aria-hidden="true" />
          {t("result.win")}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.draw}`} aria-hidden="true" />
          {t("result.draw")}
        </li>
        <li>
          <span className={`${styles.swatch} ${styles.loss}`} aria-hidden="true" />
          {t("result.loss")}
        </li>
        {competitions.map((competition, index) => (
          <li key={competition.id}>
            <span className={`${styles.swatch} ${styles[`c${index % 4}`]}`} aria-hidden="true" />
            {competition.name}
          </li>
        ))}
        <li>
          <span className={`${styles.swatch} ${styles.next}`} aria-hidden="true" />
          <span className={styles.nextText}>{t("calendar.nextGame")}</span>
        </li>
      </ul>
    </section>
  );
}
