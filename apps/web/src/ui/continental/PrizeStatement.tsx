"use client";

import type { LedgerEntry } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatDate, formatMoney, useT } from "../../i18n";
import { type Column, DataTable } from "../DataTable";
import styles from "../FinancePanel.module.css";
import { competitionName } from "../qualification/origin-text";

/** Prêmios da temporada do clube, cada um com a competição de origem (022 R4, FR-016). */
export function PrizeStatement({ save }: { save: SaveFile }) {
  const t = useT();
  const entries = save.finances.ledger
    .filter(
      (entry) =>
        entry.clubId === save.clubId &&
        entry.category === "prize" &&
        entry.competitionId !== undefined &&
        entry.season === save.league.number,
    )
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  if (entries.length === 0) return null;
  const columns: Column<LedgerEntry>[] = [
    {
      key: "date",
      header: t("finance.prizes.date"),
      render: (entry) => (entry.date ? formatDate(entry.date) : ""),
    },
    {
      key: "competition",
      header: t("finance.prizes.competition"),
      render: (entry) => competitionName(save, entry.competitionId ?? ""),
    },
    {
      key: "amount",
      header: t("finance.prizes.amount"),
      render: (entry) => formatMoney(entry.amount),
      align: "right",
    },
  ];
  return (
    <section aria-label={t("finance.prizes.title")} className={styles.card}>
      <DataTable
        rows={entries}
        columns={columns}
        rowKey={(entry) => `${entry.date}-${entry.competitionId}-${entry.amount}-${entry.round}`}
        caption={t("finance.prizes.title")}
      />
    </section>
  );
}
