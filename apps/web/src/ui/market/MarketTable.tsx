"use client";

import type { MarketRow } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatMoney, label, useT } from "../../i18n";
import { type Column, DataTable } from "../DataTable";
import { COMPARE_LIMIT } from "./CompareTray";
import styles from "./market.module.css";

/** Linhas por página da busca. */
export const MARKET_PAGE_SIZE = 50;

/**
 * Tabela de resultados da busca (028), paginada: sem coluna de ações. A linha inteira abre o modal do
 * jogador, o nome é um botão para o teclado e a caixa ao lado do nome marca para a comparação.
 */
export function MarketTable({
  save,
  rows,
  selected,
  onToggle,
  onOpen,
}: {
  save: SaveFile;
  rows: readonly MarketRow[];
  /** Jogadores marcados para a comparação. */
  selected: ReadonlySet<string>;
  onToggle: (playerId: string) => void;
  onOpen: (row: MarketRow) => void;
}) {
  const t = useT();
  const clubName = (clubId?: string) =>
    save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "";
  const codeOf = (countryId?: string) =>
    save.bank.countries.find((country) => country.id === countryId)?.code ?? "";
  const columns: Column<MarketRow>[] = [
    {
      key: "name",
      header: t("col.player"),
      render: (row) => (
        <span className={styles.nameCell}>
          <input
            type="checkbox"
            aria-label={t("market.compare.select", { name: row.displayName })}
            checked={selected.has(row.playerId)}
            disabled={!selected.has(row.playerId) && selected.size >= COMPARE_LIMIT}
            onChange={() => onToggle(row.playerId)}
            // A linha inteira abre o modal (clique, Enter e Espaço): a caixa não deve disparar isso.
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            className={styles.nameButton}
            aria-haspopup="dialog"
            aria-label={t("lineup.detailsOf", { name: row.displayName })}
            onClick={(event) => {
              // O clique da linha também abre o modal: sem isto abriria duas vezes.
              event.stopPropagation();
              onOpen(row);
            }}
          >
            {row.displayName}
          </button>
        </span>
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
    ...(rows.some((row) => row.countryId !== undefined)
      ? [
          {
            key: "country",
            header: t("col.country"),
            render: (row: MarketRow) => codeOf(row.countryId),
            sortValue: (row: MarketRow) => codeOf(row.countryId),
          },
        ]
      : []),
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
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.playerId}
      caption={t("market.resultsCaption")}
      initialSort={{ column: "strength", direction: "descending" }}
      onRowClick={onOpen}
      pageSize={MARKET_PAGE_SIZE}
      stickyFirst
    />
  );
}
