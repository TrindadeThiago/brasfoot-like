"use client";

import { forwardRef, type ReactNode } from "react";
import type { LeagueClub } from "../../game/selectors";
import { formatNumber, useT } from "../../i18n";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";
import { EmptyState } from "../EmptyState";
import { Field } from "../Field";
import styles from "./ClubPicker.module.css";

/**
 * Lista de clubes da Nova carreira (031 R5): busca por nome ou cidade e contagem sempre visíveis,
 * tabela para comparar e escolher (clique, ou Enter e Espaço na linha) e estado vazio com
 * "Limpar filtros". Os filtros de país e divisão ficam na tela, acima desta lista.
 */
export const ClubPicker = forwardRef<
  HTMLElement,
  {
    clubs: readonly LeagueClub[];
    manyCountries: boolean;
    caption: string;
    query: string;
    onQuery: (query: string) => void;
    selectedId: string | undefined;
    onSelect: (clubId: string) => void;
    onClearFilters: () => void;
    /** Muda quando os filtros de país ou divisão mudam: a tabela volta à ordenação inicial. */
    resetKey: string;
    /** Erro ligado à escolha do clube (nenhum clube escolhido). */
    error?: string | undefined;
    children?: ReactNode;
  }
>(function ClubPicker(
  {
    clubs,
    manyCountries,
    caption,
    query,
    onQuery,
    selectedId,
    onSelect,
    onClearFilters,
    resetKey,
    error,
  },
  ref,
) {
  const t = useT();
  const columns: Column<LeagueClub>[] = [
    {
      key: "club",
      header: t("col.club"),
      render: (club) => (
        <span className={styles.club}>
          <Crest crest={club.crest} label={club.name} size={28} />
          {club.name}
          {club.id === selectedId ? <Badge tone="accent">{t("newCareer.chosenMark")}</Badge> : null}
        </span>
      ),
      sortValue: (club) => club.name,
    },
    ...(manyCountries
      ? [
          {
            key: "country",
            header: t("col.country"),
            render: (club: LeagueClub) => club.countryName,
            sortValue: (club: LeagueClub) => club.countryName,
          },
        ]
      : []),
    {
      key: "city",
      header: t("col.city"),
      render: (club) => club.city,
      sortValue: (club) => club.city,
    },
    {
      key: "reputation",
      header: t("col.reputation"),
      render: (club) => club.reputation,
      sortValue: (club) => club.reputation,
      align: "right",
    },
    {
      key: "strength",
      header: t("col.strength"),
      render: (club) => club.strength.toFixed(1).replace(".", ","),
      sortValue: (club) => club.strength,
      align: "right",
    },
    {
      key: "stadium",
      header: t("col.stadium"),
      render: (club) => formatNumber(club.stadiumCapacity),
      sortValue: (club) => club.stadiumCapacity,
      align: "right",
    },
    {
      key: "division",
      header: t("newCareer.clubDivision"),
      render: (club) => club.divisionName,
      sortValue: (club) => club.divisionLevel,
    },
  ];
  return (
    <section ref={ref} tabIndex={-1} aria-label={t("newCareer.clubList")} className={styles.picker}>
      <Field label={t("newCareer.search")}>
        {(props) => (
          <input
            {...props}
            type="search"
            value={query}
            placeholder={t("newCareer.searchPlaceholder")}
            onChange={(event) => onQuery(event.target.value)}
          />
        )}
      </Field>
      <p role="status" aria-live="polite" className={styles.count}>
        {t("newCareer.results", { count: clubs.length })}
      </p>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {clubs.length === 0 ? (
        <EmptyState title={t("newCareer.noMatch")}>
          <Button onClick={onClearFilters}>{t("newCareer.clearFilters")}</Button>
        </EmptyState>
      ) : (
        <DataTable
          key={resetKey}
          rows={clubs}
          columns={columns}
          rowKey={(club) => club.id}
          caption={caption}
          initialSort={{ column: "reputation", direction: "descending" }}
          onRowClick={(club) => onSelect(club.id)}
          selected={(club) => club.id === selectedId}
        />
      )}
    </section>
  );
});
