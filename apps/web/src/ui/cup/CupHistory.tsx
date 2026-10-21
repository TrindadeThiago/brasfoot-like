"use client";

import type { CupHistoryEntry } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";
import styles from "./Bracket.module.css";

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
function finalText(t: ReturnType<typeof useT>, entry: CupHistoryEntry): string {
  const { score, shootout } = entry.final;
  const base = `${score.home} × ${score.away}`;
  return shootout
    ? `${base} ${t("cup.result.penalties", { home: shootout.home, away: shootout.away })}`
    : base;
}

/** Campeão e vice de cada edição da copa e os títulos por clube (018 US6). */
export function CupHistory({ save }: { save: SaveFile }) {
  const t = useT();
  const entries = [...save.cupHistory].reverse();
  if (entries.length === 0) return <p>{t("cup.history.empty")}</p>;
  const nameOf = (id: string) =>
    save.bank.competitions.find((entry) => entry.id === id)?.name ?? id;
  const columns: Column<CupHistoryEntry>[] = [
    { key: "year", header: t("cup.history.edition"), render: (entry) => entry.year },
    { key: "cup", header: t("cup.history.cup"), render: (entry) => nameOf(entry.competitionId) },
    {
      key: "champion",
      header: t("cup.history.champion"),
      render: (entry) => <ClubName save={save} clubId={entry.championId} />,
    },
    {
      key: "runnerUp",
      header: t("cup.history.runnerUp"),
      render: (entry) => <ClubName save={save} clubId={entry.runnerUpId} />,
    },
    { key: "final", header: t("cup.history.final"), render: (entry) => finalText(t, entry) },
  ];
  const titles = new Map<string, number>();
  for (const entry of save.cupHistory) {
    titles.set(entry.championId, (titles.get(entry.championId) ?? 0) + 1);
  }
  const ranking = [...titles.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return (
    <>
      <DataTable
        rows={entries}
        columns={columns}
        rowKey={(entry) => `${entry.competitionId}-${entry.number}`}
        caption={t("cup.history.tab")}
        highlight={(entry) => entry.championId === save.clubId}
      />
      <section aria-label={t("cup.history.titles")}>
        <h3>{t("cup.history.titles")}</h3>
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

/** Campeão e vice da copa da temporada que acabou (fim de temporada). */
export function CupResult({
  save,
  entries,
}: {
  save: SaveFile;
  entries: readonly CupHistoryEntry[];
}) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club.name]));
  return (
    <>
      {entries.map((entry) => (
        <section key={entry.competitionId} aria-label={t("cup.history.cup")}>
          <h2>{save.bank.competitions.find((item) => item.id === entry.competitionId)?.name}</h2>
          <p>{t("cup.champion", { club: clubs.get(entry.championId) ?? entry.championId })}</p>
          <p>{t("cup.runnerUp", { club: clubs.get(entry.runnerUpId) ?? entry.runnerUpId })}</p>
          <p>{finalText(t, entry)}</p>
        </section>
      ))}
    </>
  );
}
