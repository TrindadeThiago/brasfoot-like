"use client";

import type { Competition } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useId } from "react";
import type { CompetitionStatus } from "../game/competitions";
import { competitionHref } from "../game/useDivision";
import { formatDate, useT } from "../i18n";
import { Badge, type BadgeTone } from "./Badge";
import styles from "./CompetitionCard.module.css";

const TONE: Record<CompetitionStatus["kind"], BadgeTone> = {
  ongoing: "accent",
  eliminated: "danger",
  finished: "neutral",
  startsOn: "info",
  berthConfirmed: "info",
  berthPending: "warning",
  notParticipating: "neutral",
};

/** Texto da situação do clube na competição (sempre em texto, além da cor do selo). */
export function statusText(t: ReturnType<typeof useT>, status: CompetitionStatus): string {
  return status.kind === "startsOn"
    ? t("competition.status.startsOn", { date: formatDate(status.date) })
    : t(`competition.status.${status.kind}`);
}

function formatKey(competition: Competition): string {
  const type = competition.format.type;
  return type === "league" ? "league" : type === "knockout" ? "knockout" : "stages";
}

/** Cartão de uma competição (027): link para ela, com país, formato e a situação do clube. */
export function CompetitionCard({
  save,
  competition,
  status,
  path,
  current,
}: {
  save: SaveFile;
  competition: Competition;
  status: CompetitionStatus;
  path: string;
  current: boolean;
}) {
  const t = useT();
  const metaId = useId();
  const country = save.bank.countries.find((entry) => entry.id === competition.countryId);
  return (
    <div className={current ? `${styles.card} ${styles.current}` : styles.card}>
      <Link
        href={competitionHref(path, save.id, competition.id)}
        aria-current={current ? "page" : undefined}
        aria-describedby={metaId}
        className={styles.name}
      >
        {competition.name}
      </Link>
      <span id={metaId} className={styles.meta}>
        {country?.name ?? t("competition.card.international")} ·{" "}
        {t(`competition.card.format.${formatKey(competition)}`)}
      </span>
      <Badge tone={TONE[status.kind]}>{statusText(t, status)}</Badge>
    </div>
  );
}
