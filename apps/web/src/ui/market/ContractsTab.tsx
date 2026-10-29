"use client";

import type { MarketRow } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatMoney, label, useT } from "../../i18n";
import { Button } from "../Button";
import { type Column, DataTable } from "../DataTable";
import styles from "./market.module.css";

/** Contratos do elenco: salário, fim, valor, último ano e renovação (US6). */
export function ContractsTab({
  save,
  rows,
  disabled,
  onRenew,
  onOpen,
}: {
  save: SaveFile;
  rows: readonly MarketRow[];
  disabled: boolean;
  onRenew: (row: MarketRow) => void;
  /** Abre os detalhes do jogador, para decidir se vale renovar. */
  onOpen: (row: MarketRow) => void;
}) {
  const t = useT();
  const year = save.league.year;
  const squad = rows.filter((row) => row.clubId === save.clubId);
  const expiring = squad.filter((row) => (row.untilYear ?? Number.MAX_SAFE_INTEGER) <= year);
  const clubName = (clubId?: string) =>
    save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "";
  const loanOrigin = (row: MarketRow) =>
    save.bank.players.find((player) => player.id === row.playerId)?.contract?.loan?.fromClubId;
  const columns: Column<MarketRow>[] = [
    {
      key: "name",
      header: t("col.player"),
      render: (row) => (
        <button
          type="button"
          className={styles.nameButton}
          aria-haspopup="dialog"
          aria-label={t("lineup.detailsOf", { name: row.displayName })}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(row);
          }}
        >
          {row.displayName}
        </button>
      ),
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
      key: "wage",
      header: t("market.col.wage"),
      render: (row) => formatMoney(row.wage),
      sortValue: (row) => row.wage,
      align: "right",
    },
    {
      key: "until",
      header: t("market.col.until"),
      render: (row) => (
        <>
          {row.untilYear}
          {(row.untilYear ?? 0) <= year ? ` · ${t("market.contracts.lastYear")}` : ""}
        </>
      ),
      sortValue: (row) => row.untilYear ?? 0,
      align: "right",
    },
    {
      key: "value",
      header: t("market.col.value"),
      render: (row) => formatMoney(row.value),
      sortValue: (row) => row.value,
      align: "right",
    },
    {
      key: "actions",
      header: t("market.col.actions"),
      render: (row) =>
        row.onLoan ? (
          t("market.contracts.loanFrom", { club: clubName(loanOrigin(row)) })
        ) : (
          <Button
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onRenew(row);
            }}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {t("market.action.renew")}
          </Button>
        ),
    },
  ];
  return (
    <div className={styles.layout}>
      <p role="status">{t("market.contracts.expiring", { count: expiring.length })}</p>
      <DataTable
        rows={squad}
        columns={columns}
        rowKey={(row) => row.playerId}
        caption={t("market.contracts.caption")}
        initialSort={{ column: "until", direction: "ascending" }}
        onRowClick={onOpen}
      />
    </div>
  );
}
