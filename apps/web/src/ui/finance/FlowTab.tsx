"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { breakdown } from "../../game/finance-series";
import { formatMoney, formatNumber, useT } from "../../i18n";
import { ChartFigure, type LegendRow } from "../charts/ChartFigure";
import { DonutChart } from "../charts/DonutChart";
import { FinanceSummary } from "../FinanceSummary";
import styles from "./finance.module.css";

/** Receitas e despesas (028): o resumo da temporada e as roscas por origem e por destino. */
export function FlowTab({ save }: { save: SaveFile }) {
  const t = useT();
  // Nos gráficos, "salários" e "rescisões" são fatias separadas (o resumo da temporada os soma).
  const nameOf = (category: string) =>
    category === "wages" || category === "termination"
      ? t(`finance.chart.category.${category}`)
      : t(`finance.category.${category}`);
  const figure = (kind: "origin" | "destination") => {
    const rows = breakdown(save, kind);
    if (!rows) return null;
    const total = rows.reduce((sum, row) => sum + row.amount, 0);
    const top = [...rows].sort((a, b) => b.amount - a.amount)[0];
    return (
      <ChartFigure
        key={kind}
        title={t(
          kind === "origin" ? "finance.chart.origin.title" : "finance.chart.destination.title",
        )}
        summary={t("finance.chart.breakdown.summary", {
          top: top ? nameOf(top.category) : "",
          percent: top?.percent ?? 0,
          total: formatMoney(total),
        })}
        legend={rows.map(
          (row, index): LegendRow => ({
            label: nameOf(row.category),
            value: formatMoney(row.amount),
            percent: row.percent,
            series: index,
          }),
        )}
      >
        <DonutChart
          slices={rows.map((row, index) => ({
            label: nameOf(row.category),
            value: row.amount,
            series: index,
            tip: `${nameOf(row.category)}\n${formatMoney(row.amount)} · ${formatNumber(row.percent)}%`,
          }))}
          total={formatMoney(total)}
        />
      </ChartFigure>
    );
  };
  const origin = figure("origin");
  const destination = figure("destination");
  return (
    <div className={styles.tab}>
      <FinanceSummary save={save} />
      {origin || destination ? (
        <div className={styles.grid}>
          {origin}
          {destination}
        </div>
      ) : (
        <p className={styles.note}>{t("finance.chart.unavailable")}</p>
      )}
    </div>
  );
}
