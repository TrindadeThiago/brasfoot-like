"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { seasonHistory } from "../../game/finance-series";
import { formatMoney, useT } from "../../i18n";
import { ChartFigure } from "../charts/ChartFigure";
import { LineChart } from "../charts/LineChart";
import { PrizeStatement } from "../continental/PrizeStatement";
import { FinanceHistory } from "../FinanceTables";
import styles from "./finance.module.css";

/** Histórico (028): prêmios da temporada e o histórico financeiro por temporada, com gráfico, tabela e crises. */
export function HistoryTab({ save }: { save: SaveFile }) {
  const t = useT();
  const { seasons } = seasonHistory(save);
  const ordered = [...seasons].sort((a, b) => a.season - b.season);
  return (
    <div className={styles.tab}>
      <PrizeStatement save={save} />
      {ordered.length >= 2 ? (
        <ChartFigure
          title={t("finance.chart.history.title")}
          summary={t("finance.chart.history.summary", {
            count: ordered.length,
            first: formatMoney(ordered[0]?.endCash ?? 0),
            last: formatMoney(ordered.at(-1)?.endCash ?? 0),
          })}
          legend={[{ label: t("finance.chart.history.key"), series: 0 }]}
          details={ordered.map((season) => ({
            label: t("finance.chart.history.row", { year: season.year }),
            value: formatMoney(season.endCash),
          }))}
        >
          <LineChart
            points={ordered.map((season) => ({
              label: String(season.year),
              value: season.endCash,
              tip: `${season.year}\n${formatMoney(season.endCash)}`,
            }))}
          />
        </ChartFigure>
      ) : null}
      <FinanceHistory save={save} />
    </div>
  );
}
