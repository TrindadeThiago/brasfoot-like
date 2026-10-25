"use client";

import type { QualificationEntry, QualificationRecord } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";
import { competitionName } from "./origin-text";

/**
 * Classificações entre competições da temporada: o que aconteceu com o clube do jogador (vaga
 * direta, repasse ou vaga perdida) e quem se classificou para cada competição (021 FR-019).
 */
export function QualificationSummary({
  save,
  record,
  title,
}: {
  save: SaveFile;
  record: QualificationRecord | undefined;
  title?: string;
}) {
  const t = useT();
  if (!record || record.entries.length === 0) return null;
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const nameOf = (clubId: string) => clubs.get(clubId)?.name ?? clubId;
  const mine = record.entries.filter((entry) => entry.clubId === save.clubId);
  const lost = record.entries.filter((entry) => entry.passedFrom?.clubId === save.clubId);
  const columns: Column<QualificationEntry>[] = [
    {
      key: "competition",
      header: t("qualification.col.competition"),
      render: (entry) => competitionName(save, entry.competitionId),
    },
    {
      key: "club",
      header: t("qualification.col.club"),
      render: (entry) => {
        const club = clubs.get(entry.clubId);
        return (
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {club ? <Crest crest={club.crest} label={club.name} size={20} /> : null}
            {nameOf(entry.clubId)}
          </span>
        );
      },
    },
    {
      key: "via",
      header: t("qualification.col.via"),
      render: (entry) => t(`qualification.via.${entry.via}`),
    },
  ];
  const heading = title ?? t("qualification.title");
  return (
    <section aria-label={heading}>
      <h2>{heading}</h2>
      {mine.map((entry) => (
        <p key={`${entry.competitionId}-${entry.berthId}`}>
          {t(`qualification.mine.${entry.via}`, {
            club: nameOf(save.clubId),
            competition: competitionName(save, entry.competitionId),
          })}
        </p>
      ))}
      {lost.map((entry) => (
        <p key={`lost-${entry.competitionId}-${entry.berthId}`}>
          {t("qualification.mine.lost", {
            club: nameOf(save.clubId),
            competition: competitionName(save, entry.competitionId),
            other: nameOf(entry.clubId),
          })}
        </p>
      ))}
      <DataTable
        rows={record.entries}
        columns={columns}
        rowKey={(entry) => `${entry.competitionId}-${entry.level}-${entry.berthId}-${entry.clubId}`}
        caption={heading}
        highlight={(entry) => entry.clubId === save.clubId}
      />
    </section>
  );
}
