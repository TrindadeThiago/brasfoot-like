"use client";

import type { ReactNode } from "react";
import { formatNumber, useT } from "../../i18n";
import styles from "./chart.module.css";

export interface LegendRow {
  label: string;
  /** Valor já formatado (dinheiro, público…); sem ele a legenda só diz o que cada cor representa. */
  value?: string | undefined;
  percent?: number | undefined;
  /** Índice da série: a mesma cor do gráfico. */
  series: number;
  /** Preenchimento listrado (a segunda série das barras), igual ao do gráfico. */
  pattern?: boolean | undefined;
}

/**
 * Moldura de um gráfico (028): o desenho é decorativo (`role="img"` com o resumo em texto). A legenda
 * diz o que cada cor representa; se as linhas trazem valor (rosca), vira tabela com valor e
 * percentual. Os valores de cada ponto vêm no balão do mouse e, para leitor de tela, numa tabela
 * escondida (`details`), então nada depende só da cor nem do mouse.
 */
export function ChartFigure({
  title,
  summary,
  legend,
  details,
  children,
}: {
  title: string;
  /** Resumo para leitor de tela: o que o gráfico mostra e os números principais. */
  summary: string;
  legend: readonly LegendRow[];
  /** Valores de cada ponto, só para leitor de tela. */
  details?: readonly { label: string; value: string }[];
  children: ReactNode;
}) {
  const t = useT();
  const withValues = legend.some((row) => row.value !== undefined);
  const swatch = (row: LegendRow) => (
    <span
      aria-hidden="true"
      className={`${styles.swatch} ${row.pattern ? styles.sPattern : styles[`s${row.series % 5}`]}`}
    />
  );
  return (
    <figure className={styles.figure}>
      <figcaption className={styles.title}>{title}</figcaption>
      <div role="img" aria-label={summary} className={styles.drawing}>
        {children}
      </div>
      {withValues ? (
        <table className={styles.legend}>
          <caption className="visually-hidden">{t("chart.legend", { title })}</caption>
          <thead>
            <tr>
              <th scope="col">{t("chart.legend.name")}</th>
              <th scope="col">{t("chart.legend.value")}</th>
              {legend.some((row) => row.percent !== undefined) ? (
                <th scope="col">{t("chart.legend.percent")}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {legend.map((row) => (
              <tr key={row.label}>
                <td>
                  {swatch(row)}
                  {row.label}
                </td>
                <td className={styles.number}>{row.value}</td>
                {row.percent !== undefined ? (
                  <td className={styles.number}>
                    {t("chart.percent", { value: formatNumber(row.percent) })}
                  </td>
                ) : legend.some((r) => r.percent !== undefined) ? (
                  <td />
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <ul className={styles.keys} aria-label={t("chart.legend", { title })}>
          {legend.map((row) => (
            <li key={row.label}>
              {swatch(row)}
              {row.label}
            </li>
          ))}
        </ul>
      )}
      {details && details.length > 0 ? (
        <table className="visually-hidden">
          <caption>{t("chart.values", { title })}</caption>
          <thead>
            <tr>
              <th scope="col">{t("chart.legend.name")}</th>
              <th scope="col">{t("chart.legend.value")}</th>
            </tr>
          </thead>
          <tbody>
            {details.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </figure>
  );
}
