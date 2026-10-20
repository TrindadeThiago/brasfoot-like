"use client";

import type { ManagerSeasonRecord, Stint } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { type Column, DataTable } from "../DataTable";
import styles from "./board.module.css";

/** Histórico do técnico: passagens e temporadas (US9, FR-034). */
export function ManagerHistory({ save }: { save: SaveFile }) {
  const t = useT();
  const clubName = (clubId: string | null) =>
    clubId === null
      ? t("career.history.unemployedPeriod")
      : (save.bank.clubs.find((club) => club.id === clubId)?.name ?? clubId);
  const stints = save.board.history.stints.map((stint, index) => ({ ...stint, index }));
  const seasons = save.board.history.seasons.map((record, index) => ({ ...record, index }));
  const stintColumns: Column<Stint & { index: number }>[] = [
    { key: "club", header: t("career.history.club"), render: (row) => clubName(row.clubId) },
    {
      key: "period",
      header: t("career.history.period"),
      render: (row) =>
        t("career.history.periodValue", {
          fromSeason: row.from.season,
          fromRound: row.from.round,
          to: row.to
            ? t("career.history.until", { season: row.to.season, round: row.to.round })
            : t("career.history.current"),
        }),
    },
    {
      key: "exit",
      header: t("career.history.exit"),
      render: (row) => (row.exit ? t(`career.history.exit.${row.exit}`) : ""),
    },
  ];
  const seasonColumns: Column<ManagerSeasonRecord & { index: number }>[] = [
    { key: "year", header: t("career.history.year"), render: (row) => row.year },
    { key: "club", header: t("career.history.club"), render: (row) => clubName(row.clubId) },
    {
      key: "division",
      header: t("career.history.division"),
      render: (row) => (row.level !== undefined ? divisionNameOf(save, row.level) : ""),
    },
    {
      key: "position",
      header: t("career.history.position"),
      render: (row) =>
        row.position !== undefined
          ? t("career.history.positionValue", { position: row.position })
          : "",
    },
    {
      key: "goal",
      header: t("career.history.goal"),
      render: (row) =>
        row.goals
          ? t(row.goals.sportMet ? "career.history.goalMet" : "career.history.goalMissed", {
              goal: t(`board.goal.tier.${row.goals.sportTier}`),
            })
          : t("career.history.noGoal"),
    },
    {
      key: "achievements",
      header: t("career.history.achievements"),
      render: (row) =>
        row.achievements.map((entry) => t(`board.evaluation.achievement.${entry}`)).join(", "),
    },
    {
      key: "decision",
      header: t("career.history.decision"),
      render: (row) => (row.decision ? t(`board.evaluation.decision.${row.decision}`) : ""),
    },
    {
      key: "reputation",
      header: t("career.history.reputation"),
      render: (row) => row.reputation,
      align: "right",
    },
  ];
  return (
    <div className={styles.layout}>
      <DataTable
        rows={stints}
        columns={stintColumns}
        rowKey={(row) => String(row.index)}
        caption={t("career.history.stints")}
      />
      {seasons.length === 0 ? (
        <p className={styles.muted}>{t("career.history.empty")}</p>
      ) : (
        <DataTable
          rows={seasons}
          columns={seasonColumns}
          rowKey={(row) => String(row.index)}
          caption={t("career.history.seasons")}
        />
      )}
    </div>
  );
}
