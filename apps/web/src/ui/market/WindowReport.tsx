"use client";

import {
  type WindowReport as Report,
  type ReportEntry,
  reportForDivision,
  reportHighlights,
} from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile, userDivisionLevel } from "@brasfoot-like/save";
import { useState } from "react";
import { formatMoney, label, useT } from "../../i18n";
import { type Column, DataTable } from "../DataTable";
import styles from "./market.module.css";

/** Quantas transferências o resumo mostra em destaque. */
const HIGHLIGHTS = 15;

/** Resumo das transferências relevantes das janelas guardadas (011 US7). */
export function WindowReport({ save }: { save: SaveFile }) {
  const t = useT();
  const reports = save.market.reports;
  const [selected, setSelected] = useState<string | undefined>();
  const report: Report | undefined =
    reports.find((entry) => entry.id === selected) ?? reports.at(-1);
  if (!report) return <p className={styles.muted}>{t("market.report.empty")}</p>;
  const clubName = (clubId?: string) =>
    clubId
      ? (save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "")
      : t("market.free.short");
  const columns: Column<ReportEntry>[] = [
    { key: "player", header: t("market.report.col.player"), render: (row) => row.displayName },
    {
      key: "position",
      header: t("market.report.col.position"),
      render: (row) => label(`position.${row.position}`),
    },
    {
      key: "strength",
      header: t("market.report.col.strength"),
      render: (row) => row.strength,
      align: "right",
    },
    { key: "from", header: t("market.report.col.from"), render: (row) => clubName(row.fromClubId) },
    { key: "to", header: t("market.report.col.to"), render: (row) => clubName(row.toClubId) },
    {
      key: "kind",
      header: t("market.report.col.kind"),
      render: (row) => t(`market.report.kind.${row.kind}`),
    },
    {
      key: "fee",
      header: t("market.report.col.fee"),
      render: (row) => formatMoney(row.fee),
      align: "right",
    },
  ];
  const level = userDivisionLevel(save);
  const division = divisionNameOf(save, level);
  const title = t("market.report.title", { window: report.window, year: report.year });
  const own = reportForDivision(report, level);
  const rowKey = (row: ReportEntry) => `${row.playerId}-${row.kind}-${row.round}`;
  return (
    <section className={styles.layout} aria-label={title}>
      <h2>{title}</h2>
      {reports.length > 1 ? (
        <label className={styles.field}>
          <span>{t("market.report.select")}</span>
          <select value={report.id} onChange={(event) => setSelected(event.target.value)}>
            {[...reports].reverse().map((entry) => (
              <option key={entry.id} value={entry.id}>
                {t("market.report.option", { year: entry.year, window: entry.window })}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <h3>{t("market.report.highlights")}</h3>
      {report.transfers.length === 0 ? (
        <p className={styles.muted}>{t("market.report.none")}</p>
      ) : (
        <DataTable
          rows={reportHighlights(report, HIGHLIGHTS)}
          columns={columns}
          rowKey={rowKey}
          caption={t("market.report.highlights")}
        />
      )}
      <h3>{t("market.report.division", { division })}</h3>
      {own.length === 0 ? (
        <p className={styles.muted}>{t("market.report.none")}</p>
      ) : (
        <DataTable
          rows={own}
          columns={columns}
          rowKey={rowKey}
          caption={t("market.report.division", { division })}
        />
      )}
    </section>
  );
}
