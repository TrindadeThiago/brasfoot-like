"use client";

import type { ContinentalEdition } from "@brasfoot-like/engine";
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

/** Final da edição: placar, com os pênaltis quando decidiu assim. */
function finalText(t: ReturnType<typeof useT>, entry: ContinentalEdition): string {
  const { score, shootout } = entry.final;
  const base = `${score.home} × ${score.away}`;
  return shootout
    ? `${base} ${t("cup.result.penalties", { home: shootout.home, away: shootout.away })}`
    : base;
}

/** Campeão e vice de cada edição das competições entre países e os títulos por clube (022 R8). */
export function ContinentalHistory({ save }: { save: SaveFile }) {
  const t = useT();
  const editions = [...(save.continentalHistory ?? [])].reverse();
  if (editions.length === 0) return <p>{t("continental.history.empty")}</p>;
  const nameOf = (id: string) =>
    save.bank.competitions.find((entry) => entry.id === id)?.name ?? id;
  const columns: Column<ContinentalEdition>[] = [
    { key: "year", header: t("continental.history.edition"), render: (entry) => entry.year },
    {
      key: "competition",
      header: t("continental.history.competition"),
      render: (entry) => nameOf(entry.competitionId),
    },
    {
      key: "champion",
      header: t("continental.history.champion"),
      render: (entry) => <ClubName save={save} clubId={entry.championId} />,
    },
    {
      key: "runnerUp",
      header: t("continental.history.runnerUp"),
      render: (entry) => <ClubName save={save} clubId={entry.runnerUpId} />,
    },
    {
      key: "final",
      header: t("continental.history.final"),
      render: (entry) => finalText(t, entry),
    },
  ];
  const titles = new Map<string, number>();
  for (const edition of save.continentalHistory ?? []) {
    titles.set(edition.championId, (titles.get(edition.championId) ?? 0) + 1);
  }
  const ranking = [...titles.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return (
    <>
      <DataTable
        rows={editions}
        columns={columns}
        rowKey={(entry) => `${entry.competitionId}-${entry.number}`}
        caption={t("continental.history.tab")}
        highlight={(entry) => entry.championId === save.clubId}
      />
      <section aria-label={t("continental.history.titles")}>
        <h3>{t("continental.history.titles")}</h3>
        <ul>
          {ranking.map(([clubId, count]) => (
            <li key={clubId}>
              <ClubName save={save} clubId={clubId} /> · {count}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
