"use client";

import { coachOf } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";

interface Row {
  clubId: string;
  club: string;
  coach: string;
  reputation: number | undefined;
  confidence: number;
}

/** Técnicos dos clubes de uma divisão (US8): o jogador destacado; vaga aberta indicada. */
export function CoachesTable({ save, level }: { save: SaveFile; level: number }) {
  const t = useT();
  const season = save.league.divisions.find((entry) => entry.divisionLevel === level);
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const rows: Row[] = (season?.clubIds ?? []).map((clubId) => {
    const isManager = save.board.manager.clubId === clubId;
    const coach = coachOf(save.board, clubId);
    return {
      clubId,
      club: clubs.get(clubId)?.name ?? clubId,
      coach: isManager
        ? t("career.coaches.you", { name: save.managerName })
        : (coach?.name ?? t("career.coaches.vacant")),
      reputation: isManager ? save.board.manager.reputation : coach?.reputation,
      confidence: save.board.clubs[clubId]?.confidence ?? 0,
    };
  });
  const columns: Column<Row>[] = [
    {
      key: "club",
      header: t("career.coaches.club"),
      render: (row) => {
        const club = clubs.get(row.clubId);
        return (
          <>
            {club ? <Crest crest={club.crest} label={club.name} size={18} /> : null} {row.club}
          </>
        );
      },
      sortValue: (row) => row.club,
    },
    {
      key: "coach",
      header: t("career.coaches.coach"),
      render: (row) => row.coach,
      sortValue: (row) => row.coach,
    },
    {
      key: "reputation",
      header: t("career.coaches.reputation"),
      render: (row) => row.reputation ?? "",
      sortValue: (row) => row.reputation ?? 0,
      align: "right",
    },
    {
      key: "confidence",
      header: t("career.coaches.confidence"),
      render: (row) => row.confidence,
      sortValue: (row) => row.confidence,
      align: "right",
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.clubId}
      caption={t("career.coaches.caption", { division: divisionNameOf(save, level) })}
      highlight={(row) => row.clubId === save.board.manager.clubId}
      initialSort={{ column: "reputation", direction: "descending" }}
    />
  );
}
