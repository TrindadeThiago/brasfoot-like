"use client";

import { type CampaignSpot, clubCampaign } from "@brasfoot-like/engine";
import { type SaveFile, seasonStateOf } from "@brasfoot-like/save";
import { formatDate, formatMoney, useT } from "../../i18n";
import { Card } from "../Card";
import { type Column, DataTable } from "../DataTable";
import styles from "./CampaignPanel.module.css";
import { reachedText } from "./reachedText";

type T = ReturnType<typeof useT>;

/** Onde cai o jogo: rodada da fase de pontos ou fase e jogo do mata-mata. */
function spotText(t: T, save: SaveFile, competitionId: string, spot: CampaignSpot): string {
  if (spot.kind === "knockout") {
    return t("continental.spot.knockout", {
      phase: reachedText(t, save, competitionId, { stage: spot.stage, phase: spot.phase }),
      leg: spot.leg ?? 1,
    });
  }
  return t(spot.kind === "groups" ? "continental.spot.groups" : "continental.spot.league", {
    round: spot.stageRound ?? 1,
  });
}

/**
 * Campanha do clube na competição entre países (022 R10): fase atual, jogos, próximo compromisso,
 * prêmios e o que ainda é possível alcançar. Sem o clube na competição, não mostra nada.
 */
export function CampaignPanel({ save, competitionId }: { save: SaveFile; competitionId: string }) {
  const t = useT();
  const campaign = clubCampaign(seasonStateOf(save), competitionId, save.clubId);
  if (!campaign) return null;
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club.name]));
  const club = clubs.get(save.clubId) ?? save.clubId;
  const opponent = (home: string, away: string) =>
    clubs.get(home === save.clubId ? away : home) ?? "";
  const columns: Column<(typeof campaign.matches)[number]>[] = [
    { key: "date", header: t("continental.campaign.date"), render: (m) => formatDate(m.date) },
    {
      key: "spot",
      header: t("continental.campaign.spot"),
      render: (m) => spotText(t, save, competitionId, m),
    },
    {
      key: "opponent",
      header: t("continental.campaign.opponent"),
      render: (m) => opponent(m.home, m.away),
    },
    {
      key: "venue",
      header: t("continental.campaign.venue"),
      render: (m) =>
        t(m.home === save.clubId ? "continental.venue.home" : "continental.venue.away"),
    },
    {
      key: "score",
      header: t("continental.campaign.score"),
      render: (m) => `${m.score.home} × ${m.score.away}`,
      align: "right",
    },
  ];
  const total = campaign.awards.reduce((sum, award) => sum + award.amount, 0);
  return (
    <Card aria-label={t("continental.campaign.title", { club })} className={styles.card}>
      <h2>{t("continental.campaign.title", { club })}</h2>
      <p>
        <strong>{t(`continental.campaign.status.${campaign.status}`)}</strong> ·{" "}
        {t("continental.campaign.reached", {
          phase: reachedText(t, save, competitionId, campaign.reached),
        })}
      </p>
      {campaign.next ? (
        <p>
          {t("continental.campaign.next", {
            date: formatDate(campaign.next.date),
            venue: campaign.next.home ? "home" : "away",
            opponent: clubs.get(campaign.next.opponentId) ?? "",
            spot: spotText(t, save, competitionId, campaign.next),
          })}
        </p>
      ) : (
        <p className={styles.muted}>{t("continental.campaign.noNext")}</p>
      )}
      {campaign.remaining.length > 0 ? (
        <p>
          {t("continental.campaign.remaining", {
            phases: campaign.remaining
              .map((rung) => reachedText(t, save, competitionId, rung))
              .join(", "),
          })}
        </p>
      ) : null}
      <p>
        {t("continental.campaign.awards", {
          amount: formatMoney(total),
          count: campaign.awards.length,
        })}
      </p>
      {campaign.matches.length > 0 ? (
        <DataTable
          rows={campaign.matches}
          columns={columns}
          rowKey={(m) => String(m.round)}
          caption={t("continental.campaign.matches")}
        />
      ) : null}
    </Card>
  );
}
