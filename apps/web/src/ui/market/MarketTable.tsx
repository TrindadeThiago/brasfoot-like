"use client";

import type { MarketRow } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatMoney, label, useT } from "../../i18n";
import { Button } from "../Button";
import { type Column, DataTable } from "../DataTable";
import styles from "./market.module.css";

export type RowAction = "buy" | "loan" | "free";

/** Tabela de resultados da busca, com seleção para comparar e ações por linha (US1, US2, US7). */
export function MarketTable({
  save,
  rows,
  selected,
  disabled,
  onToggle,
  onAction,
}: {
  save: SaveFile;
  rows: readonly MarketRow[];
  selected: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (playerId: string) => void;
  onAction: (row: MarketRow, action: RowAction) => void;
}) {
  const t = useT();
  const clubName = (clubId?: string) =>
    save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "";
  const columns: Column<MarketRow>[] = [
    {
      key: "compare",
      header: t("market.col.compare"),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={t("market.compare.select", { name: row.displayName })}
          checked={selected.has(row.playerId)}
          onChange={() => onToggle(row.playerId)}
        />
      ),
    },
    {
      key: "name",
      header: t("col.player"),
      render: (row) => row.displayName,
      sortValue: (row) => row.displayName,
    },
    {
      key: "position",
      header: t("col.playerPosition"),
      render: (row) => label(`position.${row.position}`),
      sortValue: (row) => row.position,
    },
    {
      key: "age",
      header: t("col.age"),
      render: (row) => row.age,
      sortValue: (row) => row.age,
      align: "right",
    },
    {
      key: "strength",
      header: t("col.strength"),
      render: (row) => row.strength,
      sortValue: (row) => row.strength,
      align: "right",
    },
    {
      key: "traits",
      header: t("col.traits"),
      render: (row) => row.traits.map((trait) => label(`trait.${trait}`)).join(", ") || "—",
    },
    {
      key: "club",
      header: t("market.col.club"),
      render: (row) =>
        row.free ? (
          t("market.free")
        ) : (
          <>
            {clubName(row.clubId)}
            {row.onLoan ? ` · ${t("market.onLoan")}` : ""}
          </>
        ),
      sortValue: (row) => (row.free ? "" : clubName(row.clubId)),
    },
    {
      key: "value",
      header: t("market.col.value"),
      render: (row) => (row.free ? "—" : formatMoney(row.value)),
      sortValue: (row) => row.value,
      align: "right",
    },
    {
      key: "wage",
      header: t("market.col.wage"),
      render: (row) => formatMoney(row.wage),
      sortValue: (row) => row.wage,
      align: "right",
    },
    {
      key: "until",
      header: t("market.col.until"),
      render: (row) => row.untilYear ?? "—",
      sortValue: (row) => row.untilYear ?? 0,
      align: "right",
    },
    {
      key: "actions",
      header: t("market.col.actions"),
      render: (row) => {
        if (row.clubId === save.clubId) return t("market.ownClub");
        if (row.free) {
          return (
            <Button disabled={disabled} onClick={() => onAction(row, "free")}>
              {t("market.action.sign")}
            </Button>
          );
        }
        if (row.onLoan) return t("market.onLoan");
        return (
          <span className={styles.actions}>
            <Button disabled={disabled} onClick={() => onAction(row, "buy")}>
              {t("market.action.offer")}
            </Button>
            <Button disabled={disabled} onClick={() => onAction(row, "loan")}>
              {t("market.action.loan")}
            </Button>
          </span>
        );
      },
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.playerId}
      caption={t("market.resultsCaption")}
      initialSort={{ column: "strength", direction: "descending" }}
    />
  );
}
