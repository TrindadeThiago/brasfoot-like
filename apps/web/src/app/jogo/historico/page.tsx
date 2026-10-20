"use client";

import type { HistoryRow, SeasonHistoryEntry } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import { useT } from "../../../i18n";
import { screenHref } from "../../../ui/AppHeader";
import { Button } from "../../../ui/Button";
import { Crest } from "../../../ui/Crest";
import { type Column, DataTable } from "../../../ui/DataTable";
import { ClubHistory, Records, Scorers, Titles } from "../../../ui/history/WorldHistory";
import styles from "./page.module.css";

type Tab = "seasons" | "titles" | "scorers" | "records" | "clubs";
const TABS: readonly Tab[] = ["seasons", "titles", "scorers", "records", "clubs"];

function historyHref(careerId: string, number: number): string {
  return `${screenHref("/jogo/historico", careerId)}&t=${number}`;
}

/** Posição e divisão do clube do jogador numa temporada do histórico. */
function myPlace(entry: SeasonHistoryEntry, clubId: string) {
  for (const division of entry.divisions) {
    const row = division.standings.find((item) => item.clubId === clubId);
    if (row) return { level: division.level, position: row.position };
  }
  return undefined;
}

function ClubCell({ save, clubId }: { save: SaveFile; clubId: string }) {
  const club = save.bank.clubs.find((entry) => entry.id === clubId);
  return (
    <span className={styles.club}>
      {club ? <Crest crest={club.crest} label={club.name} size={20} /> : null}
      {club?.name ?? clubId}
    </span>
  );
}

function HistoryList({ save }: { save: SaveFile }) {
  const t = useT();
  if (save.history.length === 0) return <p className={styles.empty}>{t("history.empty")}</p>;
  const levels = save.history[0]?.divisions.map((division) => division.level) ?? [];
  const columns: Column<SeasonHistoryEntry>[] = [
    {
      key: "season",
      header: t("history.colSeason"),
      render: (entry) => (
        <Link
          href={historyHref(save.id, entry.number)}
          aria-label={t("history.open", { year: entry.year })}
        >
          {t("history.season", { year: entry.year })}
        </Link>
      ),
      sortValue: (entry) => entry.number,
    },
    ...levels.map(
      (level): Column<SeasonHistoryEntry> => ({
        key: `champion-${level}`,
        header: t("history.champion", { division: divisionNameOf(save, level) }),
        render: (entry) => {
          const championId = entry.divisions.find(
            (division) => division.level === level,
          )?.championId;
          return championId ? <ClubCell save={save} clubId={championId} /> : null;
        },
      }),
    ),
    ...levels.map(
      (level): Column<SeasonHistoryEntry> => ({
        key: `scorer-${level}`,
        header: `${t("history.topScorer")} · ${divisionNameOf(save, level)}`,
        render: (entry) => {
          const scorer = save.news.seasons
            .find((item) => item.season === entry.number)
            ?.scorers.find((item) => item.level === level);
          return scorer?.name
            ? t("history.topScorerValue", { name: scorer.name, goals: scorer.goals })
            : t("history.noScorer");
        },
      }),
    ),
    {
      key: "mine",
      header: t("history.colMyClub"),
      render: (entry) => {
        const place = myPlace(entry, save.clubId);
        return place
          ? t("history.myClub", {
              position: place.position,
              division: divisionNameOf(save, place.level),
            })
          : null;
      },
    },
  ];
  return (
    <DataTable
      rows={[...save.history].reverse()}
      columns={columns}
      rowKey={(entry) => String(entry.number)}
      caption={t("history.caption")}
    />
  );
}

function HistoryDetail({ save, entry }: { save: SaveFile; entry: SeasonHistoryEntry }) {
  const t = useT();
  const number = (key: keyof HistoryRow, header: string): Column<HistoryRow> => ({
    key,
    header,
    render: (row) => String(row[key]),
    align: "right",
  });
  return (
    <div className={styles.detail}>
      <Link href={screenHref("/jogo/historico", save.id)}>{t("history.back")}</Link>
      {entry.divisions.map((division) => {
        const zone = (row: HistoryRow) =>
          division.promoted.includes(row.clubId)
            ? "promotion"
            : division.relegated.includes(row.clubId)
              ? "relegation"
              : undefined;
        const columns: Column<HistoryRow>[] = [
          {
            ...number("position", t("col.position")),
            render: (row) => {
              const moved = zone(row);
              return (
                <span className={styles.position}>
                  {row.position}
                  {moved ? (
                    <span className={`${styles.zone} ${styles[moved]}`}>
                      {t(`standings.zone.${moved}`)}
                    </span>
                  ) : null}
                </span>
              );
            },
          },
          {
            key: "club",
            header: t("col.club"),
            render: (row) => <ClubCell save={save} clubId={row.clubId} />,
          },
          number("points", t("col.points")),
          number("played", t("col.played")),
          number("wins", t("col.wins")),
          number("draws", t("col.draws")),
          number("losses", t("col.losses")),
          number("goalsFor", t("col.goalsFor")),
          number("goalsAgainst", t("col.goalsAgainst")),
        ];
        return (
          <DataTable
            key={division.level}
            rows={division.standings}
            columns={columns}
            rowKey={(row) => row.clubId}
            caption={t("history.standings", {
              division: divisionNameOf(save, division.level),
              year: entry.year,
            })}
            highlight={(row) => row.clubId === save.clubId}
          />
        );
      })}
    </div>
  );
}

function History({ save }: { save: SaveFile }) {
  const t = useT();
  const params = useSearchParams();
  const requested = Number(params?.get("t"));
  const entry = save.history.find((item) => item.number === requested);
  const [tab, setTab] = useState<Tab>("seasons");
  if (entry) {
    return (
      <div className={styles.layout}>
        <h1>{t("history.title")}</h1>
        <HistoryDetail save={save} entry={entry} />
      </div>
    );
  }
  return (
    <div className={styles.layout}>
      <h1>{t("history.title")}</h1>
      <div role="tablist" aria-label={t("history.tablist")} className={styles.tabs}>
        {TABS.map((name) => (
          <Button
            key={name}
            role="tab"
            aria-selected={tab === name}
            variant={tab === name ? "primary" : "secondary"}
            onClick={() => setTab(name)}
          >
            {t(`history.tab.${name}`)}
          </Button>
        ))}
      </div>
      {tab === "seasons" ? <HistoryList save={save} /> : null}
      {tab === "titles" ? <Titles save={save} /> : null}
      {tab === "scorers" ? <Scorers save={save} /> : null}
      {tab === "records" ? <Records save={save} /> : null}
      {tab === "clubs" ? <ClubHistory save={save} /> : null}
      <Link href={`${screenHref("/jogo/carreira", save.id)}&aba=history`}>
        {t("history.managerLink")}
      </Link>
    </div>
  );
}

export default function HistoryPage() {
  return <GameLayout>{(save) => <History save={save} />}</GameLayout>;
}
