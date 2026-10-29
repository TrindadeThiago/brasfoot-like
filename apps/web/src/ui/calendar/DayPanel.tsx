"use client";

import type { ClubFixture } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { matchResult } from "../../game/selectors";
import { formatDate, formatWeekday, useT } from "../../i18n";
import { Button } from "../Button";
import { phaseLabel } from "../cup/phase";
import { DerbyBadge } from "../fans/DerbyBadge";
import { MatchHighlights } from "../MatchHighlights";
import { stageLabel } from "../stages/label";
import styles from "./DayPanel.module.css";

/**
 * Painel do dia escolhido (027): para cada jogo do dia, a data, o adversário, o mando, a
 * competição, a fase, o resultado e as ações Resumo e Ver jogos da rodada.
 */
export function DayPanel({
  save,
  date,
  fixtures,
  competitionName,
  onSummary,
  onRound,
}: {
  save: SaveFile;
  date: string | undefined;
  fixtures: readonly ClubFixture[];
  competitionName: (competitionId: string) => string;
  onSummary: (record: NonNullable<ClubFixture["record"]>) => void;
  onRound: (fixture: ClubFixture) => void;
}) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  return (
    <section aria-label={t("calendar.panel")} className={styles.panel}>
      <h2>{t("calendar.panel")}</h2>
      {date === undefined || fixtures.length === 0 ? (
        <p className={styles.empty}>{t("calendar.panelEmpty")}</p>
      ) : (
        <ul className={styles.list}>
          {fixtures.map((fixture) => {
            const other = clubs.get(fixture.home === save.clubId ? fixture.away : fixture.home);
            const record = fixture.record;
            const phase =
              stageLabel(save, fixture) ?? phaseLabel(save, fixture.competitionId, fixture.round);
            return (
              <li key={`${fixture.day}-${fixture.competitionId}`} className={styles.item}>
                <strong>
                  {other?.name}
                  <DerbyBadge
                    rivalries={save.bank.rivalries}
                    home={fixture.home}
                    away={fixture.away}
                  />
                </strong>
                <span>
                  {formatWeekday(fixture.date)}, {formatDate(fixture.date)}
                </span>
                <span>
                  {fixture.home === save.clubId ? t("calendar.home") : t("calendar.away")}
                </span>
                <span>{competitionName(fixture.competitionId)}</span>
                <span>
                  {phase
                    ? t("calendar.phase", { phase })
                    : t("home.roundLabel", { round: fixture.round })}
                </span>
                <span>
                  {record
                    ? t("calendar.result", {
                        score: `${t(`result.${matchResult(record, save.clubId)}`)} ${
                          fixture.home === save.clubId ? record.score.home : record.score.away
                        } × ${fixture.home === save.clubId ? record.score.away : record.score.home}`,
                      })
                    : t("calendar.notPlayed")}
                </span>
                {record ? <MatchHighlights record={record} save={save} /> : null}
                <span className={styles.actions}>
                  {record ? (
                    <Button
                      aria-label={t("summary.open", {
                        home: clubs.get(fixture.home)?.shortName ?? "",
                        away: clubs.get(fixture.away)?.shortName ?? "",
                      })}
                      onClick={() => onSummary(record)}
                    >
                      {t("summary.button")}
                    </Button>
                  ) : null}
                  <Button
                    aria-label={t("calendar.showRound", { round: fixture.round })}
                    onClick={() => onRound(fixture)}
                  >
                    {t("calendar.showRoundShort")}
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
