"use client";

import type { LeagueSeason } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";
import { originText } from "./origin-text";

interface Row {
  clubId: string;
  level: number;
}

/**
 * De onde veio cada participante da competição (021 FR-016): posição ou título em outra competição,
 * acesso, repasse ou banco inicial. Nada aparece em competições sem vagas.
 */
export function ParticipantOrigins({ save, league }: { save: SaveFile; league: LeagueSeason }) {
  const t = useT();
  const origins = league.origins;
  if (!origins) return null;
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const rows: Row[] = league.divisions.flatMap((season) =>
    season.clubIds.map((clubId) => ({ clubId, level: season.divisionLevel })),
  );
  rows.sort(
    (a, b) =>
      a.level - b.level ||
      (clubs.get(a.clubId)?.name ?? a.clubId).localeCompare(clubs.get(b.clubId)?.name ?? b.clubId),
  );
  const columns: Column<Row>[] = [
    {
      key: "club",
      header: t("col.club"),
      render: (row) => {
        const club = clubs.get(row.clubId);
        return (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {club ? <Crest crest={club.crest} label={club.name} size={20} /> : null}
            {club?.name ?? row.clubId}
          </span>
        );
      },
    },
    {
      key: "origin",
      header: t("origin.col.origin"),
      render: (row) => {
        const origin = origins[row.clubId];
        return origin ? originText(t, save, origin) : "";
      },
    },
  ];
  return (
    <section aria-label={t("origin.title")}>
      <h2>{t("origin.title")}</h2>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.clubId}
        caption={t("origin.title")}
        highlight={(row) => row.clubId === save.clubId}
      />
    </section>
  );
}
