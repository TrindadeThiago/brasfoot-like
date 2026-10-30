"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { type CampaignRow, campaign } from "../../game/season-view";
import type { SeasonEndSummary } from "../../game/selectors";
import { formatMoney, useT } from "../../i18n";
import { Evaluation } from "../board/Evaluation";
import { Card } from "../Card";
import { reachedText } from "../continental/reachedText";
import { type Column, DataTable } from "../DataTable";
import { competitionName } from "../qualification/origin-text";
import styles from "./season.module.css";

/**
 * Como foi a sua temporada (030): a campanha por competição com a premiação e o total, e a avaliação
 * da diretoria. A premiação da liga só é paga na virada, e a tela diz isso.
 */
export function Campaign({ save, summary }: { save: SaveFile; summary: SeasonEndSummary }) {
  const t = useT();
  const { rows, total } = campaign(save, summary);
  const outcome = (row: CampaignRow): string => {
    if (row.kind === "league" && row.position !== undefined) {
      return t("seasonEnd.campaign.position", { position: row.position });
    }
    if (row.phase) return row.phase.champion ? t("seasonEnd.campaign.champion") : row.phase.name;
    if (row.reached) {
      const reached = reachedText(t, save, row.competitionId, row.reached);
      return row.goal ? t("seasonEnd.campaign.goal", { reached, goal: row.goal }) : reached;
    }
    return "—";
  };
  const columns: Column<CampaignRow>[] = [
    {
      key: "competition",
      header: t("seasonEnd.campaign.competition"),
      render: (row) => competitionName(save, row.competitionId),
    },
    { key: "outcome", header: t("seasonEnd.campaign.outcome"), render: outcome },
    {
      key: "prize",
      header: t("seasonEnd.campaign.prize"),
      render: (row) => (
        <>
          {row.prize > 0 ? formatMoney(row.prize) : "—"}
          {row.kind === "league" && !row.paid && row.prize > 0 ? (
            <span className={styles.note}> ({t("seasonEnd.campaign.pending")})</span>
          ) : null}
        </>
      ),
      align: "right",
    },
  ];
  const pending = rows.some((row) => row.kind === "league" && !row.paid && row.prize > 0);
  return (
    <section aria-label={t("seasonEnd.campaign")} className={styles.section}>
      <h2>{t("seasonEnd.campaign")}</h2>
      <Card>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.competitionId}
          caption={t("seasonEnd.campaign.table")}
        />
        <p className={styles.total}>
          {t("seasonEnd.campaign.total", { amount: formatMoney(total) })}
        </p>
        {pending ? <p className={styles.note}>{t("seasonEnd.campaign.totalNote")}</p> : null}
      </Card>
      <Evaluation save={save} />
    </section>
  );
}
