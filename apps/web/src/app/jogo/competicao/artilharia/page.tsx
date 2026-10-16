"use client";

import { type PlayerSeasonStats, topAssists, topScorers } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { GameLayout } from "../../../../game/GameLayout";
import { useT } from "../../../../i18n";
import { CompetitionTabs } from "../../../../ui/CompetitionTabs";
import { Crest } from "../../../../ui/Crest";
import { type Column, DataTable } from "../../../../ui/DataTable";
import styles from "./page.module.css";

function Scorers({ save }: { save: SaveFile }) {
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
  const scorers = topScorers(save.season, 20).filter((row) => row.goals > 0);
  const assists = topAssists(save.season, 20).filter((row) => row.assists > 0);
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

export default function ScorersPage() {
  return (
    <GameLayout>
      {(save) => (
        <>
          <CompetitionTabs careerId={save.id} />
          <Scorers save={save} />
        </>
      )}
    </GameLayout>
  );
}
