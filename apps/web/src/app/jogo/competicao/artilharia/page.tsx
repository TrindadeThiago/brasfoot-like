"use client";

import { type PlayerSeasonStats, type Season, topAssists, topScorers } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { GameLayout } from "../../../../game/GameLayout";
import { useDivision } from "../../../../game/useDivision";
import { useT } from "../../../../i18n";
import { CompetitionTabs } from "../../../../ui/CompetitionTabs";
import { Crest } from "../../../../ui/Crest";
import { type Column, DataTable } from "../../../../ui/DataTable";
import { DivisionTabs } from "../../../../ui/DivisionTabs";
import styles from "./page.module.css";

function Scorers({ save, season }: { save: SaveFile; season: Season }) {
  const t = useT();
  const players = new Map(save.bank.players.map((player) => [player.id, player]));
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const columns = (field: "goals" | "assists", header: string): Column<PlayerSeasonStats>[] => [
    {
      key: "player",
      header: t("col.player"),
      render: (row) => players.get(row.playerId)?.displayName ?? row.playerId,
    },
    {
      key: "club",
      header: t("col.club"),
      render: (row) => {
        const club = clubs.get(row.clubId);
        return (
          <span className={styles.club}>
            {club ? <Crest crest={club.crest} label={club.name} size={18} /> : null}
            {club?.shortName}
          </span>
        );
      },
    },
    { key: field, header, render: (row) => row[field], align: "right" },
  ];
  const scorers = topScorers(season, 20).filter((row) => row.goals > 0);
  const assists = topAssists(season, 20).filter((row) => row.assists > 0);
  if (scorers.length === 0) return <p className={styles.empty}>{t("scorers.empty")}</p>;
  return (
    <div className={styles.columns}>
      <DataTable
        rows={scorers}
        columns={columns("goals", t("col.goals"))}
        rowKey={(row) => row.playerId}
        caption={t("scorers.goals")}
        highlight={(row) => row.clubId === save.clubId}
      />
      <DataTable
        rows={assists}
        columns={columns("assists", t("col.assists"))}
        rowKey={(row) => row.playerId}
        caption={t("scorers.assists")}
        highlight={(row) => row.clubId === save.clubId}
      />
    </div>
  );
}

function ScorersScreen({ save }: { save: SaveFile }) {
  const { level, season } = useDivision(save);
  return (
    <>
      <CompetitionTabs careerId={save.id} level={level} />
      <DivisionTabs save={save} level={level} />
      <Scorers key={level} save={save} season={season} />
    </>
  );
}

export default function ScorersPage() {
  return <GameLayout>{(save) => <ScorersScreen save={save} />}</GameLayout>;
}
