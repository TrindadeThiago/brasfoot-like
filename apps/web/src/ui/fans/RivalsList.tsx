"use client";

import { clubDivision, rivalsOf } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";
import styles from "./fans.module.css";

interface Row {
  clubId: string;
  intensity: number;
}

/** Rivais do clube com a divisão atual e a intensidade (013 FR-016). */
export function RivalsList({ save, clubId }: { save: SaveFile; clubId: string }) {
  const t = useT();
  const rivals = rivalsOf(save.bank, clubId);
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  if (rivals.length === 0) return <p className={styles.muted}>{t("fans.rivals.empty")}</p>;
  const columns: Column<Row>[] = [
    {
      key: "club",
      header: t("fans.rivals.club"),
      render: (row) => {
        const club = clubs.get(row.clubId);
        return (
          <>
            {club ? <Crest crest={club.crest} label={club.name} size={18} /> : null} {club?.name}
          </>
        );
      },
    },
    {
      key: "division",
      header: t("fans.rivals.division"),
      render: (row) => {
        const level = clubDivision(save.league, row.clubId)?.divisionLevel;
        return level !== undefined ? divisionNameOf(save, level) : "";
      },
    },
    {
      key: "intensity",
      header: t("fans.rivals.intensity"),
      render: (row) => t(`fans.intensity.${row.intensity}`),
    },
  ];
  return (
    <DataTable
      rows={rivals}
      columns={columns}
      rowKey={(row) => row.clubId}
      caption={t("fans.rivals.title")}
    />
  );
}
