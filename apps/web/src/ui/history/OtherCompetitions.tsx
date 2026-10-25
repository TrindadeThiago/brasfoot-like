"use client";

import type { HistoryRow, SeasonHistoryEntry } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";
import styles from "./OtherCompetitions.module.css";

/** Campeões e tabelas finais das competições secundárias (017 FR-034); nada sem elas. */
export function OtherCompetitions({
  save,
  entries,
}: {
  save: SaveFile;
  entries: readonly SeasonHistoryEntry[];
}) {
  const t = useT();
  // As competições entre países têm a aba própria "Campeões continentais" (022).
  entries = entries.filter(
    (entry) =>
      save.bank.competitions.find((item) => item.id === entry.competitionId)?.countryId !==
      undefined,
  );
  // Num mundo de vários países as tabelas de todos eles seriam centenas: um seletor de país (020).
  const countryOf = (competitionId: string) =>
    save.bank.competitions.find((item) => item.id === competitionId)?.countryId ?? "";
  const countryIds = [...new Set(entries.map((entry) => countryOf(entry.competitionId)))];
  const own = countryOf(save.league.competitionId);
  const [chosen, setChosen] = useState(countryIds.includes(own) ? own : (countryIds[0] ?? ""));
  if (entries.length === 0) return null;
  const shown =
    countryIds.length > 1
      ? entries.filter((entry) => countryOf(entry.competitionId) === chosen)
      : entries;
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const columns: Column<HistoryRow>[] = [
    { key: "position", header: t("col.position"), render: (row) => row.position, align: "right" },
    {
      key: "club",
      header: t("col.club"),
      render: (row) => {
        const club = clubs.get(row.clubId);
        return (
          <span className={styles.club}>
            {club ? <Crest crest={club.crest} label={club.name} size={20} /> : null}
            {club?.name ?? row.clubId}
          </span>
        );
      },
    },
    { key: "points", header: t("col.points"), render: (row) => row.points, align: "right" },
    { key: "played", header: t("col.played"), render: (row) => row.played, align: "right" },
  ];
  return (
    <section aria-label={t("history.otherCompetitions")} className={styles.section}>
      <h2>{t("history.otherCompetitions")}</h2>
      {countryIds.length > 1 ? (
        <label className={styles.country}>
          <span>{t("history.country")}</span>
          <select value={chosen} onChange={(event) => setChosen(event.target.value)}>
            {countryIds.map((id) => (
              <option key={id} value={id}>
                {save.bank.countries.find((country) => country.id === id)?.name ?? id}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {shown.flatMap((entry) => {
        const name = save.bank.competitions.find((item) => item.id === entry.competitionId)?.name;
        return entry.divisions.map((division) => {
          const champion = clubs.get(division.championId)?.name ?? division.championId;
          const caption = `${name ?? entry.competitionId} · ${divisionNameOf(save, division.level, entry.competitionId)} · ${entry.year}`;
          return (
            <div key={`${entry.competitionId}-${entry.number}-${division.level}`}>
              <p>{t("history.otherChampion", { club: champion })}</p>
              <DataTable
                rows={division.standings}
                columns={columns}
                rowKey={(row) => row.clubId}
                caption={caption}
                highlight={(row) => row.clubId === save.clubId}
              />
            </div>
          );
        });
      })}
    </section>
  );
}
