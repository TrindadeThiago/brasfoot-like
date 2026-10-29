"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { debtSeries } from "../../game/finance-series";
import type { useGame } from "../../game/GameProvider";
import { formatMoney, formatMonthShort, useT } from "../../i18n";
import { CreditPanel } from "../CreditPanel";
import { ChartFigure } from "../charts/ChartFigure";
import { LineChart } from "../charts/LineChart";
import styles from "./finance.module.css";

type Game = ReturnType<typeof useGame>;

/** Crédito (028): limite em uso, tomar, amortizar, quitar e a dívida ao longo da temporada. */
export function CreditTab({ save, game, locked }: { save: SaveFile; game: Game; locked: boolean }) {
  const t = useT();
  const debt = save.finances.clubs[save.clubId]?.debt ?? 0;
  const series = debtSeries(save);
  const label = (key: string) =>
    key === "start" ? t("finance.chart.start") : formatMonthShort(key);
  return (
    <div className={styles.tab}>
      <p>{t("finance.credit.inUse", { debt: formatMoney(debt) })}</p>
      <CreditPanel save={save} disabled={locked} onTake={game.takeLoan} onRepay={game.repayLoan} />
      {series ? (
        <ChartFigure
          title={t("finance.chart.debt.title")}
          summary={t("finance.chart.debt.summary", {
            start: formatMoney(series[0]?.debt ?? 0),
            end: formatMoney(series.at(-1)?.debt ?? 0),
          })}
          legend={[{ label: t("finance.chart.debt.key"), series: 0 }]}
          details={series.map((point) => ({
            label: t("finance.chart.debt.row", { month: label(point.key) }),
            value: formatMoney(point.debt),
          }))}
        >
          <LineChart
            points={series.map((point) => ({
              label: label(point.key),
              value: point.debt,
              tip: `${label(point.key)}\n${formatMoney(point.debt)}`,
            }))}
          />
        </ChartFigure>
      ) : (
        <p className={styles.note}>{t("finance.chart.unavailable")}</p>
      )}
    </div>
  );
}
