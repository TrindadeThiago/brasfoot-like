"use client";

import { type StandingRow, standings } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import { Crest } from "./Crest";
import { type Column, DataTable } from "./DataTable";
import { FormChips } from "./FormChips";

/** Classificação da divisão, com o clube do jogador destacado. */
export function StandingsTable({ save, caption }: { save: SaveFile; caption: string }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const number = (key: keyof StandingRow, header: string): Column<StandingRow> => ({
    key,
    header,
    render: (row) => String(row[key]),
    sortValue: (row) => row[key] as number,
    align: "right",
  });
  const columns: Column<StandingRow>[] = [
    number("position", t("col.position")),
    {
      key: "club",
      header: t("col.club"),
      render: (row) => {
        const club = clubs.get(row.clubId);
        return (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {club ? <Crest crest={club.crest} label={club.name} size={22} /> : null}
            {club?.name}
          </span>
        );
      },
      sortValue: (row) => clubs.get(row.clubId)?.name ?? row.clubId,
    },
    number("points", t("col.points")),
    number("played", t("col.played")),
    number("wins", t("col.wins")),
    number("draws", t("col.draws")),
    number("losses", t("col.losses")),
    number("goalsFor", t("col.goalsFor")),
    number("goalsAgainst", t("col.goalsAgainst")),
    {
      ...number("goalDifference", t("col.goalDifference")),
      render: (row) =>
        row.goalDifference > 0 ? `+${row.goalDifference}` : String(row.goalDifference),
    },
    { key: "form", header: t("col.form"), render: (row) => <FormChips form={row.form} /> },
  ];
  return (
    <DataTable
      rows={standings(save.season, save.bank)}
      columns={columns}
      rowKey={(row) => row.clubId}
      caption={caption}
      highlight={(row) => row.clubId === save.clubId}
    />
  );
}
