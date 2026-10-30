"use client";

import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { clubResult } from "../../game/season-view";
import type { SeasonEndSummary } from "../../game/selectors";
import { formatNumber, useT } from "../../i18n";
import { Badge, type BadgeTone } from "../Badge";
import { Card } from "../Card";
import styles from "./ClubResult.module.css";

const TONE: Record<string, BadgeTone> = {
  champion: "warning",
  promoted: "accent",
  relegated: "danger",
  stayed: "neutral",
};
const SYMBOL: Record<string, string> = {
  champion: "★",
  promoted: "▲",
  relegated: "▼",
  stayed: "■",
};

/** Resultado do clube em destaque: situação em texto e símbolo, posição, pontos, jogos, gols e saldo (030). */
export function ClubResult({ save, summary }: { save: SaveFile; summary: SeasonEndSummary }) {
  const t = useT();
  const result = clubResult(save, summary);
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const facts: [string, string][] = [
    ["col.position", String(result.position)],
    ["col.points", String(result.points)],
    ["col.wins", String(result.wins)],
    ["col.draws", String(result.draws)],
    ["col.losses", String(result.losses)],
    ["col.goalsFor", String(result.goalsFor)],
    ["col.goalsAgainst", String(result.goalsAgainst)],
    ["col.goalDifference", formatNumber(result.goalDifference)],
  ];
  return (
    <Card
      aria-label={t("seasonEnd.result")}
      className={`${styles.card} ${styles[result.situation]}`}
    >
      <Badge tone={TONE[result.situation] ?? "neutral"}>
        <span aria-hidden="true">{SYMBOL[result.situation]} </span>
        {t(`seasonEnd.situation.${result.situation}`)}
      </Badge>
      <p className={styles.message}>
        {t(`seasonEnd.mine.${result.situation}`, {
          club: club?.name ?? "",
          position: result.position,
          division: divisionNameOf(
            save,
            result.situation === "champion" ? result.level : result.nextLevel,
          ),
        })}
      </p>
      <dl className={styles.facts}>
        {facts.map(([key, value]) => (
          <div key={key}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
