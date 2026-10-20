"use client";

import { type LedgerCategory, seasonFinanceSummary } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatMoney, useT } from "../i18n";
import styles from "./FinancePanel.module.css";

const REVENUES: readonly LedgerCategory[] = [
  "gate",
  "sponsorship",
  "prize",
  "loan_in",
  "transfer_sale",
];
const EXPENSES: readonly LedgerCategory[] = [
  "wages",
  "interest",
  "loan_out",
  "stadium",
  "transfer_purchase",
];

/** Receitas e despesas da temporada por categoria, com saldo inicial e atual (US4, FR-024). */
export function FinanceSummary({ save }: { save: SaveFile }) {
  const t = useT();
  const summary = seasonFinanceSummary(save.finances, save.clubId);
  const group = (title: string, categories: readonly LedgerCategory[]) => {
    const total = categories.reduce((sum, category) => sum + summary.totals[category], 0);
    return (
      <div>
        <h3>{title}</h3>
        <dl className={styles.list}>
          {categories.map((category) => (
            <div key={category}>
              <dt>{t(`finance.category.${category}`)}</dt>
              <dd>{formatMoney(summary.totals[category])}</dd>
            </div>
          ))}
          <div className={styles.total}>
            <dt>{t("finance.total")}</dt>
            <dd>{formatMoney(total)}</dd>
          </div>
        </dl>
      </div>
    );
  };
  return (
    <section aria-label={t("finance.season", { year: save.league.year })} className={styles.card}>
      <h2>{t("finance.season", { year: save.league.year })}</h2>
      <p>
        {t("finance.startBalance")}: {formatMoney(summary.startCash)} ·{" "}
        {t("finance.currentBalance")}: {formatMoney(summary.cash)}
      </p>
      <div className={styles.columns}>
        {group(t("finance.revenues"), REVENUES)}
        {group(t("finance.expenses"), EXPENSES)}
      </div>
    </section>
  );
}
