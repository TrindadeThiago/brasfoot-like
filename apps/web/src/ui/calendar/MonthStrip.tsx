"use client";

import type { CalendarMonth } from "../../game/calendar-month";
import { formatMonthTitle, useT } from "../../i18n";
import styles from "./MonthStrip.module.css";

/** Faixa de meses da temporada (027): um botão por mês, com a contagem de jogos. */
export function MonthStrip<F>({
  months,
  current,
  onChoose,
}: {
  months: readonly CalendarMonth<F>[];
  current: string | undefined;
  onChoose: (key: string) => void;
}) {
  const t = useT();
  return (
    <nav aria-label={t("calendar.months")} className={styles.strip}>
      {months.map((month) => (
        <button
          key={month.key}
          type="button"
          aria-current={month.key === current ? "true" : undefined}
          className={month.key === current ? `${styles.month} ${styles.current}` : styles.month}
          onClick={() => onChoose(month.key)}
        >
          <span className={styles.name}>{formatMonthTitle(month.key).replace(/ de /, " ")}</span>
          <span className={styles.count}>
            {t("calendar.monthCount", { count: month.fixtureCount })}
          </span>
        </button>
      ))}
    </nav>
  );
}
