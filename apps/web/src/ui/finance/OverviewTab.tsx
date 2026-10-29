"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { balanceSeries, monthlyFlows } from "../../game/finance-series";
import { formatMoney, formatMonthShort, useT } from "../../i18n";
import { BarChart } from "../charts/BarChart";
import { ChartFigure } from "../charts/ChartFigure";
import { LineChart } from "../charts/LineChart";
import { FinanceSummary } from "../FinanceSummary";
import styles from "./finance.module.css";

/** Visão geral (028): saldo ao longo da temporada em linha e receitas × despesas por mês em barras. */
export function OverviewTab({ save }: { save: SaveFile }) {
  const t = useT();
  const balance = balanceSeries(save);
  const flows = monthlyFlows(save);
  const label = (key: string) =>
    key === "start" ? t("finance.chart.start") : formatMonthShort(key);
  return (
    <div className={styles.tab}>
      {balance ? (
        <ChartFigure
          title={t("finance.chart.balance.title")}
          summary={t("finance.chart.balance.summary", {
            start: formatMoney(balance[0]?.cash ?? 0),
            end: formatMoney(balance.at(-1)?.cash ?? 0),
            min: formatMoney(Math.min(...balance.map((point) => point.cash))),
            max: formatMoney(Math.max(...balance.map((point) => point.cash))),
          })}
          legend={[{ label: t("finance.chart.balance.key"), series: 0 }]}
          details={balance.map((point) => ({
            label: t("finance.chart.balance.row", { month: label(point.key) }),
            value: formatMoney(point.cash),
          }))}
        >
          <LineChart
            points={balance.map((point) => ({
              label: label(point.key),
              value: point.cash,
              tip: `${label(point.key)}\n${formatMoney(point.cash)}`,
            }))}
          />
        </ChartFigure>
      ) : null}
      {flows && flows.length > 0 ? (
        <ChartFigure
          title={t("finance.chart.flows.title")}
          summary={t("finance.chart.flows.summary", {
            months: flows.length,
            income: formatMoney(flows.reduce((sum, month) => sum + month.income, 0)),
            expense: formatMoney(flows.reduce((sum, month) => sum + month.expense, 0)),
          })}
          legend={[
            { label: t("finance.chart.flows.incomeKey"), series: 0 },
            { label: t("finance.chart.flows.expenseKey"), series: 1, pattern: true },
          ]}
          details={flows.flatMap((month) => [
            {
              label: t("finance.chart.flows.income", { month: formatMonthShort(month.month) }),
              value: formatMoney(month.income),
            },
            {
              label: t("finance.chart.flows.expense", { month: formatMonthShort(month.month) }),
              value: formatMoney(month.expense),
            },
          ])}
        >
          <BarChart
            groups={flows.map((month) => ({
              label: formatMonthShort(month.month),
              first: month.income,
              second: month.expense,
              tip: `${formatMonthShort(month.month)}\n${t("finance.chart.flows.incomeKey")}: ${formatMoney(month.income)}\n${t("finance.chart.flows.expenseKey")}: ${formatMoney(month.expense)}`,
            }))}
          />
        </ChartFigure>
      ) : null}
      {!balance && !flows ? (
        <>
          <p className={styles.note}>{t("finance.chart.unavailable")}</p>
          <FinanceSummary save={save} />
        </>
      ) : null}
    </div>
  );
}
