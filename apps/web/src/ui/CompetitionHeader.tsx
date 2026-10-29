"use client";

import { competitionSeason, isLeagueSeasonOver } from "@brasfoot-like/engine";
import { type SaveFile, seasonStateOf } from "@brasfoot-like/save";
import { useMemo } from "react";
import { clubCompetitions } from "../game/competitions";
import { formatDate, useT } from "../i18n";
import styles from "./CompetitionHeader.module.css";
import { CompetitionList } from "./CompetitionList";
import { Notice } from "./Notice";

/** Texto do formato de uma competição, para o bloco de "ainda não começou". */
function formatText(t: ReturnType<typeof useT>, type: string): string {
  const key = type === "league" ? "league" : type === "knockout" ? "knockout" : "stages";
  return t(`competition.card.format.${key}`);
}

/**
 * Topo das telas da competição (027): a lista de competições em abas, o aviso "seu clube não
 * participa" nas competições em que ele não joga e, quando a competição ainda não começou,
 * o início, a vaga e o formato.
 */
export function CompetitionHeader({
  save,
  competitionId,
}: {
  save: SaveFile;
  competitionId: string;
}) {
  const t = useT();
  const entry = useMemo(
    () => clubCompetitions(save).find((item) => item.competition.id === competitionId),
    [save, competitionId],
  );
  const state = seasonStateOf(save);
  let started = true;
  let over = false;
  try {
    const season = competitionSeason(state, competitionId);
    started = season.divisions.some((division) => division.records.length > 0);
    over = isLeagueSeasonOver(season);
  } catch {
    started = false;
  }
  const start = save.calendar.days.find((day) =>
    day.slots.some((slot) => slot.competitionId === competitionId),
  )?.date;
  return (
    <div className={styles.header}>
      <CompetitionList save={save} competitionId={competitionId} />
      {entry && !entry.mine ? (
        <Notice tone="info" title={t("competition.status.notParticipating")}>
          <p className={styles.text}>{t("competition.notParticipating")}</p>
        </Notice>
      ) : null}
      {entry && !started && !over ? (
        <Notice tone="info" title={t("competition.notStarted.title")}>
          <ul className={styles.facts}>
            {start ? (
              <li>{t("competition.notStarted.start", { date: formatDate(start) })}</li>
            ) : null}
            <li>
              {t("competition.notStarted.format", {
                format: formatText(t, entry.competition.format.type),
              })}
            </li>
          </ul>
        </Notice>
      ) : null}
    </div>
  );
}
