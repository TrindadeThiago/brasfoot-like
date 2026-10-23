"use client";

import { type ClubFixture, clubFixtures, competitionSeason } from "@brasfoot-like/engine";
import { nextFixture, seasonStateOf } from "@brasfoot-like/save";
import { useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import { matchResult } from "../../../game/selectors";
import { formatDate, formatWeekday, useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { Crest } from "../../../ui/Crest";
import { phaseLabel } from "../../../ui/cup/phase";
import { type Column, DataTable } from "../../../ui/DataTable";
import { FormChips } from "../../../ui/FormChips";
import { DerbyBadge } from "../../../ui/fans/DerbyBadge";
import styles from "./page.module.css";

const ALL = "all";

/** Chave estável de um jogo do clube: dia do calendário e competição. */
const keyOf = (fixture: ClubFixture) => `${fixture.day}-${fixture.competitionId}`;

export default function CalendarPage() {
  const t = useT();
  const [open, setOpen] = useState<string | undefined>();
  const [filter, setFilter] = useState<string>(ALL);
  return (
    <GameLayout>
      {(save) => {
        const state = seasonStateOf(save);
        const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
        const all = clubFixtures(state, save.clubId);
        const competitionIds = [...new Set(all.map((fixture) => fixture.competitionId))];
        const nameOf = (competitionId: string) =>
          save.bank.competitions.find((entry) => entry.id === competitionId)?.name ?? "";
        const rows = filter === ALL ? all : all.filter((f) => f.competitionId === filter);
        const next = nextFixture(save);
        const opponentOf = (fixture: ClubFixture) =>
          clubs.get(fixture.home === save.clubId ? fixture.away : fixture.home);
        const columns: Column<ClubFixture>[] = [
          {
            key: "date",
            header: t("col.date"),
            render: (fixture) =>
              t("home.matchWhen", {
                weekday: formatWeekday(fixture.date),
                date: formatDate(fixture.date),
              }),
            sortValue: (fixture) => fixture.date,
          },
          ...(competitionIds.length > 1
            ? [
                {
                  key: "competition",
                  header: t("col.competition"),
                  render: (fixture: ClubFixture) => nameOf(fixture.competitionId),
                  sortValue: (fixture: ClubFixture) => nameOf(fixture.competitionId),
                },
              ]
            : []),
          {
            key: "round",
            header: t("col.round"),
            render: (fixture) =>
              phaseLabel(save, fixture.competitionId, fixture.round) ?? fixture.round,
            sortValue: (fixture) => fixture.round,
            align: "right",
          },
          {
            key: "opponent",
            header: t("col.opponent"),
            render: (fixture) => {
              const other = opponentOf(fixture);
              return other ? (
                <span className={styles.club}>
                  <Crest crest={other.crest} label={other.name} size={20} />
                  {other.name}
                  <DerbyBadge rivalries={save.bank.rivalries} home={save.clubId} away={other.id} />
                </span>
              ) : null;
            },
          },
          {
            key: "venue",
            header: t("col.venue"),
            render: (fixture) =>
              fixture.home === save.clubId ? t("calendar.home") : t("calendar.away"),
          },
          {
            key: "score",
            header: t("col.score"),
            render: (fixture) => {
              const record = fixture.record;
              if (!record) return <span className={styles.score}>{t("calendar.notPlayed")}</span>;
              const mine = fixture.home === save.clubId;
              const goalsFor = mine ? record.score.home : record.score.away;
              const goalsAgainst = mine ? record.score.away : record.score.home;
              const shootout = record.decision?.shootout?.score;
              return (
                <span className={styles.score}>
                  <FormChips form={[matchResult(record, save.clubId)]} /> {goalsFor} ×{" "}
                  {goalsAgainst}
                  {shootout
                    ? ` ${t("calendar.penalties", {
                        mine: mine ? shootout.home : shootout.away,
                        theirs: mine ? shootout.away : shootout.home,
                      })}`
                    : ""}
                </span>
              );
            },
          },
          {
            key: "details",
            header: "",
            render: (fixture) => (
              <Button
                aria-label={t("calendar.showRound", { round: fixture.round })}
                aria-expanded={open === keyOf(fixture)}
                onClick={() => setOpen(keyOf(fixture))}
              >
                {t("calendar.showRoundShort")}
              </Button>
            ),
          },
        ];
        const selected = open ? all.find((fixture) => keyOf(fixture) === open) : undefined;
        const detail = selected
          ? competitionSeason(state, selected.competitionId).divisions.find(
              (division) => division.divisionLevel === selected.divisionLevel,
            )
          : undefined;
        const detailRound = selected ? detail?.calendar[selected.round - 1] : undefined;
        return (
          <div className={styles.layout}>
            <div>
              {competitionIds.length > 1 ? (
                <label className={styles.filter}>
                  <span>{t("calendar.filter")}</span>
                  <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                    <option value={ALL}>{t("calendar.all")}</option>
                    {competitionIds.map((id) => (
                      <option key={id} value={id}>
                        {nameOf(id)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <DataTable
                rows={rows}
                columns={columns}
                rowKey={keyOf}
                caption={t("calendar.caption", { club: clubs.get(save.clubId)?.name ?? "" })}
                highlight={(fixture) => next !== undefined && keyOf(fixture) === keyOf(next)}
              />
            </div>
            {selected && detailRound ? (
              <section
                aria-label={t("calendar.roundMatches", { round: selected.round })}
                className={styles.detail}
              >
                <h2>{t("calendar.roundMatches", { round: selected.round })}</h2>
                <ul>
                  {detailRound.fixtures.map((fixture) => {
                    const record = detail?.records.find(
                      (entry) => entry.round === selected.round && entry.home === fixture.home,
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
                        <DerbyBadge
                          rivalries={save.bank.rivalries}
                          home={fixture.home}
                          away={fixture.away}
                        />
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
