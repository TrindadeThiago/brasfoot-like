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
import { competitionName } from "./qualification/origin-text";
import styles from "./StandingsTable.module.css";

type Zone =
  | "promotion"
  | "relegation"
  | "qualified"
  | "extra"
  | "qualifiedToday"
  | "extraToday"
  | "relegationToday";

/** Cor da marca de cada zona. */
const TONE: Record<Zone, "promotion" | "relegation" | "qualified" | "extra"> = {
  promotion: "promotion",
  relegation: "relegation",
  qualified: "qualified",
  extra: "extra",
  qualifiedToday: "qualified",
  extraToday: "extra",
  relegationToday: "relegation",
};

/**
 * Classificação da divisão (padrão: a do jogador), com o clube do jogador destacado e, com
 * `zones`, as posições de acesso e rebaixamento marcadas em texto (FR-006).
 */
export function StandingsTable({
  save,
  caption,
  season = userSeason(save),
  zones,
  rows: given,
  qualification,
  zoneOf: customZone,
  legend: customLegend,
  extraColumns = [],
}: {
  save: SaveFile;
  caption: string;
  season?: Season;
  zones?: DivisionZones;
  /** Linhas já calculadas (a tabela de um grupo, 019); sem elas, a classificação da divisão. */
  rows?: readonly StandingRow[];
  /** Zona de classificação de uma fase de pontos: os `qualified` primeiros e, com `extra`, a posição seguinte. */
  qualification?: { qualified: number; extra: boolean };
  /** Zona de cada linha, no lugar das calculadas por `zones` e `qualification` (019). */
  zoneOf?: (row: StandingRow) => Zone | undefined;
  /** Texto da legenda, no lugar do calculado. */
  legend?: string;
  /** Colunas a mais, depois do clube (por exemplo o grupo, na classificação geral). */
  extraColumns?: Column<StandingRow>[];
}) {
  const t = useT();
  const rows = given ?? standings(season, save.bank);
  const zoneOf = (row: StandingRow): Zone | undefined => {
    if (customZone) return customZone(row);
    if (qualification) {
      if (row.position <= qualification.qualified) return "qualified";
      if (qualification.extra && row.position === qualification.qualified + 1) return "extra";
      return undefined;
    }
    if (!zones) return undefined;
    if (row.position <= zones.promotion) return "promotion";
    if (row.position > rows.length - zones.relegation) return "relegation";
    return undefined;
  };
  const berthOf = (row: StandingRow) =>
    zones?.berths.find((zone) => row.position >= zone.from && row.position <= zone.to);
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
        const berth = berthOf(row);
        return (
          <span className={styles.position}>
            {row.position}
            {berth ? (
              <span className={`${styles.zone} ${styles.qualified}`}>
                {t("standings.zone.berth", {
                  competition: competitionName(save, berth.competitionId),
                })}
              </span>
            ) : null}
            {zone ? (
              <span className={`${styles.zone} ${styles[TONE[zone]]}`}>
                {t(
                  zone === "promotion" || zone === "relegation"
                    ? `standings.zone.${zone}`
                    : `stages.zone.${zone}`,
                )}
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
    ...extraColumns,
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
  const berthLegend = (zones?.berths ?? [])
    .map((zone) =>
      t("standings.zone.berthLegend", {
        count: zone.to - zone.from + 1,
        from: zone.from,
        to: zone.to,
        competition: competitionName(save, zone.competitionId),
        phase: zone.entry?.phase ? zone.entry.phase : "none",
      }),
    )
    .join(t("standings.zone.berthJoin"));
  const baseLegend = customLegend
    ? customLegend
    : qualification
      ? t("stages.zone.legend", {
          qualified: qualification.qualified,
          extra: qualification.extra ? "yes" : "no",
        })
      : zones && zones.promotion + zones.relegation > 0
        ? t("standings.zone.legend", {
            promotion: zones.promotion,
            relegation: zones.relegation,
            both: zones.promotion > 0 && zones.relegation > 0 ? "yes" : "no",
          })
        : undefined;
  const legend = [baseLegend, berthLegend || undefined]
    .filter((part): part is string => part !== undefined)
    .join(t("standings.zone.berthJoin"));
  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.clubId}
        caption={caption}
        highlight={(row) => row.clubId === save.clubId}
      />
      {legend !== "" ? <p className={styles.legend}>{legend}</p> : null}
    </>
  );
}
