"use client";

import type { Round } from "@brasfoot-like/engine";
import { userSeason } from "@brasfoot-like/save";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import { resultInRound } from "../../../game/selectors";
import { useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { Crest } from "../../../ui/Crest";
import { type Column, DataTable } from "../../../ui/DataTable";
import styles from "./page.module.css";

export default function CalendarPage() {
  const t = useT();
  const [open, setOpen] = useState<number | undefined>();
  return (
    <GameLayout>
      {(save) => {
        const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
        const mine = (round: Round) =>
          round.fixtures.find(
            (fixture) => fixture.home === save.clubId || fixture.away === save.clubId,
          );
        const columns: Column<Round>[] = [
          { key: "round", header: t("col.round"), render: (round) => round.number, align: "right" },
          {
            key: "opponent",
            header: t("col.opponent"),
            render: (round) => {
              const fixture = mine(round);
              const other = fixture
                ? clubs.get(fixture.home === save.clubId ? fixture.away : fixture.home)
                : undefined;
              return other ? (
                <span className={styles.club}>
                  <Crest crest={other.crest} label={other.name} size={20} />
                  {other.name}
                </span>
              ) : null;
            },
          },
          {
            key: "venue",
            header: t("col.venue"),
            render: (round) =>
              mine(round)?.home === save.clubId ? t("calendar.home") : t("calendar.away"),
          },
          {
            key: "score",
            header: t("col.score"),
            render: (round) => {
              const result = resultInRound(userSeason(save), save.clubId, round.number);
              return (
                <span className={styles.score}>
                  {result ? `${result.goalsFor} × ${result.goalsAgainst}` : t("calendar.notPlayed")}
                </span>
              );
            },
          },
          {
            key: "details",
            header: "",
            render: (round) => (
              <Button
                aria-label={t("calendar.showRound", { round: round.number })}
                aria-expanded={open === round.number}
                onClick={() => setOpen(round.number)}
              >
                {t("calendar.showRoundShort")}
              </Button>
            ),
          },
        ];
        const selected = open ? userSeason(save).calendar[open - 1] : undefined;
        return (
          <div className={styles.layout}>
            <DataTable
              rows={userSeason(save).calendar}
              columns={columns}
              rowKey={(round) => String(round.number)}
              caption={t("calendar.caption", { club: clubs.get(save.clubId)?.name ?? "" })}
              highlight={(round) => round.number === userSeason(save).nextRound}
            />
            {selected ? (
              <section
                aria-label={t("calendar.roundMatches", { round: selected.number })}
                className={styles.detail}
              >
                <h2>{t("calendar.roundMatches", { round: selected.number })}</h2>
                <ul>
                  {selected.fixtures.map((fixture) => {
                    const record = userSeason(save).records.find(
                      (entry) => entry.round === selected.number && entry.home === fixture.home,
                    );
                    return (
                      <li key={fixture.home}>
                        <span>{clubs.get(fixture.home)?.shortName}</span>
                        <strong>
                          {record
                            ? `${record.score.home} × ${record.score.away}`
                            : t("calendar.notPlayed")}
                        </strong>
                        <span>{clubs.get(fixture.away)?.shortName}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        );
      }}
    </GameLayout>
  );
}
