"use client";

import {
  allTimeScorers,
  CLUB_RECORD_KINDS,
  clubLegends,
  LEAGUE_RECORD_KINDS,
  type Legend,
  newsRules,
  type RecordEntry,
  titlesByClub,
} from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { type Column, DataTable } from "../DataTable";
import styles from "./history.module.css";

function ClubName({ save, clubId }: { save: SaveFile; clubId: string | undefined }) {
  const club = save.bank.clubs.find((entry) => entry.id === clubId);
  if (!club) return null;
  return (
    <span className={styles.club}>
      <Crest crest={club.crest} label={club.name} size={18} />
      {club.name}
    </span>
  );
}

/** Títulos por clube em cada divisão (derivados do histórico de temporadas). */
export function Titles({ save }: { save: SaveFile }) {
  const t = useT();
  const titles = titlesByClub(save.history);
  if (titles.length === 0) return <p className={styles.empty}>{t("history.titles.empty")}</p>;
  const levels = [...new Set(titles.map((row) => row.level))];
  type Row = (typeof titles)[number];
  const columns: Column<Row>[] = [
    {
      key: "club",
      header: t("history.titles.club"),
      render: (row) => <ClubName save={save} clubId={row.clubId} />,
    },
    {
      key: "count",
      header: t("history.titles.count"),
      render: (row) => row.titles,
      align: "right",
    },
    { key: "years", header: t("history.titles.years"), render: (row) => row.years.join(", ") },
  ];
  return (
    <>
      {levels.map((level) => (
        <DataTable
          key={level}
          rows={titles.filter((row) => row.level === level)}
          columns={columns}
          rowKey={(row) => row.clubId}
          caption={t("history.titles.caption", { division: divisionNameOf(save, level) })}
          highlight={(row) => row.clubId === save.clubId}
        />
      ))}
    </>
  );
}

function legendColumns(t: ReturnType<typeof useT>): Column<Legend>[] {
  return [
    { key: "player", header: t("history.scorers.player"), render: (row) => row.name },
    {
      key: "goals",
      header: t("history.scorers.goals"),
      render: (row) => row.goals,
      align: "right",
    },
    {
      key: "matches",
      header: t("history.scorers.matches"),
      render: (row) => row.matches,
      align: "right",
    },
  ];
}

/** Artilheiros históricos da liga, aposentados incluídos. */
export function Scorers({ save }: { save: SaveFile }) {
  const t = useT();
  const { allTimeTop } = newsRules(save.bank, save.league.competitionId);
  const rows = allTimeScorers(save.news, allTimeTop);
  if (rows.length === 0) return <p className={styles.empty}>{t("history.scorers.empty")}</p>;
  return (
    <DataTable
      rows={rows}
      columns={legendColumns(t)}
      rowKey={(row) => row.playerId}
      caption={t("history.scorers.caption")}
    />
  );
}

/** Texto da marca de um recorde, por tipo. */
function recordText(
  t: ReturnType<typeof useT>,
  save: SaveFile,
  kind: string,
  entry: RecordEntry,
): string {
  const name = (clubId: string | undefined) =>
    save.bank.clubs.find((club) => club.id === clubId)?.name ?? clubId ?? "";
  const club = name(entry.clubId);
  const opponent = name(entry.opponentId);
  if (kind === "biggestWin" || kind === "biggestLoss") {
    return t("history.records.score", {
      club,
      opponent,
      goalsFor: entry.score?.[0] ?? entry.value,
      goalsAgainst: entry.score?.[1] ?? 0,
    });
  }
  if (kind === "mostGoalsMatch")
    return t("history.records.goals", { club, opponent, value: entry.value });
  if (kind === "mostPlayerGoalsSeason") {
    return t("history.records.player", {
      player: entry.playerName ?? "",
      club,
      value: entry.value,
    });
  }
  if (kind === "mostPointsSeason") return t("history.records.points", { club, value: entry.value });
  return t("history.records.streak", { club, value: entry.value });
}

function RecordsTable({
  save,
  entries,
  caption,
}: {
  save: SaveFile;
  entries: [string, RecordEntry][];
  caption: string;
}) {
  const t = useT();
  if (entries.length === 0) return <p className={styles.empty}>{t("history.records.empty")}</p>;
  const columns: Column<[string, RecordEntry]>[] = [
    {
      key: "kind",
      header: t("history.records.kind"),
      render: ([kind]) => t(`history.records.${kind}`),
    },
    {
      key: "value",
      header: t("history.records.value"),
      render: ([kind, entry]) => recordText(t, save, kind, entry),
    },
    {
      key: "when",
      header: t("history.records.when"),
      render: ([, entry]) => entry.year,
      align: "right",
    },
  ];
  return <DataTable rows={entries} columns={columns} rowKey={([kind]) => kind} caption={caption} />;
}

/** Recordes da liga. */
export function Records({ save }: { save: SaveFile }) {
  const t = useT();
  const entries = LEAGUE_RECORD_KINDS.flatMap((kind): [string, RecordEntry][] => {
    const entry = save.news.records.league[kind];
    return entry ? [[kind, entry]] : [];
  });
  return <RecordsTable save={save} entries={entries} caption={t("history.records.caption")} />;
}

/** Histórico de um clube: títulos, recordes e lendas. */
export function ClubHistory({ save }: { save: SaveFile }) {
  const t = useT();
  const clubs = [...save.bank.clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const [clubId, setClubId] = useState(save.clubId);
  const { legendsPerClub } = newsRules(save.bank, save.league.competitionId);
  const titles = titlesByClub(save.history).filter((row) => row.clubId === clubId);
  const records = CLUB_RECORD_KINDS.flatMap((kind): [string, RecordEntry][] => {
    const entry = save.news.records.clubs[clubId]?.[kind];
    return entry ? [[kind, entry]] : [];
  });
  const legends = clubLegends(save.news, clubId, legendsPerClub);
  return (
    <div className={styles.layout}>
      <label className={styles.toolbar}>
        <span>{t("history.clubs.select")}</span>
        <select value={clubId} onChange={(event) => setClubId(event.target.value)}>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name}
            </option>
          ))}
        </select>
      </label>
      <section aria-label={t("history.clubs.titles")} className={styles.card}>
        <h2>{t("history.clubs.titles")}</h2>
        {titles.length === 0 ? (
          <p className={styles.empty}>{t("history.clubs.noTitles")}</p>
        ) : (
          <ul className={styles.list}>
            {titles.map((row) => (
              <li key={row.level}>
                {t("history.clubs.titleLine", {
                  division: divisionNameOf(save, row.level),
                  count: row.titles,
                  years: row.years.join(", "),
                })}
              </li>
            ))}
          </ul>
        )}
      </section>
      <RecordsTable save={save} entries={records} caption={t("history.records.clubCaption")} />
      {legends.byMatches.length === 0 ? (
        <p className={styles.empty}>{t("history.legends.empty")}</p>
      ) : (
        <>
          <DataTable
            rows={legends.byGoals}
            columns={legendColumns(t)}
            rowKey={(row) => row.playerId}
            caption={t("history.legends.byGoals")}
          />
          <DataTable
            rows={legends.byMatches}
            columns={legendColumns(t)}
            rowKey={(row) => row.playerId}
            caption={t("history.legends.byMatches")}
          />
        </>
      )}
    </div>
  );
}
