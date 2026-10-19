"use client";

import {
  type DivisionZones,
  type Season,
  type StandingRow,
  standings,
} from "@brasfoot-like/engine";
import { type SaveFile, userSeason } from "@brasfoot-like/save";
import { useT } from "../i18n";
import { Crest } from "./Crest";
import { type Column, DataTable } from "./DataTable";
import { FormChips } from "./FormChips";
import styles from "./StandingsTable.module.css";

/**
 * Classificação da divisão (padrão: a do jogador), com o clube do jogador destacado e, com
 * `zones`, as posições de acesso e rebaixamento marcadas em texto (FR-006).
 */
export function StandingsTable({
  save,
  caption,
  season = userSeason(save),
  zones,
}: {
  save: SaveFile;
  caption: string;
  season?: Season;
  zones?: DivisionZones;
}) {
  const t = useT();
  const rows = standings(season, save.bank);
  const zoneOf = (row: StandingRow): "promotion" | "relegation" | undefined => {
    if (!zones) return undefined;
    if (row.position <= zones.promotion) return "promotion";
    if (row.position > rows.length - zones.relegation) return "relegation";
    return undefined;
  };
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const number = (key: keyof StandingRow, header: string): Column<StandingRow> => ({
    key,
    header,
    render: (row) => String(row[key]),
    sortValue: (row) => row[key] as number,
    align: "right",
  });
  const columns: Column<StandingRow>[] = [
    {
      ...number("position", t("col.position")),
      render: (row) => {
        const zone = zoneOf(row);
        return (
          <span className={styles.position}>
            {row.position}
            {zone ? (
              <span className={`${styles.zone} ${styles[zone]}`}>
                {t(`standings.zone.${zone}`)}
              </span>
            ) : null}
          </span>
        );
      },
    },
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
  const legend =
    zones && zones.promotion + zones.relegation > 0
      ? t("standings.zone.legend", {
          promotion: zones.promotion,
          relegation: zones.relegation,
          both: zones.promotion > 0 && zones.relegation > 0 ? "yes" : "no",
        })
      : undefined;
  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.clubId}
        caption={caption}
        highlight={(row) => row.clubId === save.clubId}
      />
      {legend ? <p className={styles.legend}>{legend}</p> : null}
    </>
  );
}
