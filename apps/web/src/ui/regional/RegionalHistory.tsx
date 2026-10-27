"use client";

import type { RegionalEdition } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import styles from "../cup/Bracket.module.css";
import { type Column, DataTable } from "../DataTable";

function ClubName({ save, clubId }: { save: SaveFile; clubId: string }) {
  const club = save.bank.clubs.find((entry) => entry.id === clubId);
  return (
    <span className={styles.side}>
      {club ? <Crest crest={club.crest} label={club.name} size={20} /> : null}
      {club?.name ?? clubId}
    </span>
  );
}

interface Row {
  key: string;
  year: number;
  competitionId: string;
  level: number;
  championId: string;
  runnerUpId: string;
  promotedIds: string[];
  relegatedIds: string[];
}

/** Uma linha por estadual, divisão e temporada, da mais recente para a mais antiga. */
function rowsOf(editions: readonly RegionalEdition[]): Row[] {
  return [...editions].reverse().flatMap((edition) =>
    edition.divisions.map((division) => ({
      key: `${edition.competitionId}-${edition.number}-${division.level}`,
      year: edition.year,
      competitionId: edition.competitionId,
      ...division,
    })),
  );
}

/**
 * Campeões das duas divisões dos estaduais por temporada, com quem subiu e quem caiu (023 R8). Só
 * o estadual do clube do técnico aparece primeiro; os demais ficam logo abaixo, pela data.
 */
export function RegionalHistory({ save }: { save: SaveFile }) {
  const t = useT();
  const rows = rowsOf(save.regionalHistory ?? []);
  if (rows.length === 0) return <p>{t("regional.history.empty")}</p>;
  const nameOf = (id: string) =>
    save.bank.competitions.find((entry) => entry.id === id)?.name ?? id;
  const names = (ids: readonly string[]) => (
    <>
      {ids.map((id) => (
        <div key={id}>
          <ClubName save={save} clubId={id} />
        </div>
      ))}
    </>
  );
  const columns: Column<Row>[] = [
    { key: "year", header: t("regional.history.edition"), render: (row) => row.year },
    {
      key: "competition",
      header: t("regional.history.competition"),
      render: (row) => nameOf(row.competitionId),
    },
    {
      key: "level",
      header: t("regional.history.division"),
      render: (row) =>
        save.bank.competitions
          .find((entry) => entry.id === row.competitionId)
          ?.divisions.find((division) => division.level === row.level)?.name ?? row.level,
    },
    {
      key: "champion",
      header: t("regional.history.champion"),
      render: (row) => <ClubName save={save} clubId={row.championId} />,
    },
    {
      key: "runnerUp",
      header: t("regional.history.runnerUp"),
      render: (row) => <ClubName save={save} clubId={row.runnerUpId} />,
    },
    {
      key: "promoted",
      header: t("regional.history.promoted"),
      render: (row) => names(row.promotedIds),
    },
    {
      key: "relegated",
      header: t("regional.history.relegated"),
      render: (row) => names(row.relegatedIds),
    },
  ];
  return (
    <DataTable
      rows={rows}
      columns={columns}
      rowKey={(row) => row.key}
      caption={t("regional.history.tab")}
      highlight={(row) => row.championId === save.clubId}
    />
  );
}
