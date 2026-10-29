"use client";

import {
  type ClubFixture,
  clubFixtures,
  competitionSeason,
  type MatchRecord,
} from "@brasfoot-like/engine";
import { currentDate, nextFixture, type SaveFile, seasonStateOf } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { calendarMonths, monthOfNext } from "../../../game/calendar-month";
import { GameLayout } from "../../../game/GameLayout";
import { formatMonthTitle, useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { DayPanel } from "../../../ui/calendar/DayPanel";
import { MonthGrid } from "../../../ui/calendar/MonthGrid";
import { MonthLegend } from "../../../ui/calendar/MonthLegend";
import { MonthStrip } from "../../../ui/calendar/MonthStrip";
import { Dialog } from "../../../ui/Dialog";
import { EmptyState } from "../../../ui/EmptyState";
import { DerbyBadge } from "../../../ui/fans/DerbyBadge";
import { MatchSummary } from "../../../ui/MatchSummary";
import styles from "./page.module.css";

const ALL = "all";

/** Chave estável de um jogo do clube: dia do calendário e competição. */
const keyOf = (fixture: ClubFixture) => `${fixture.day}-${fixture.competitionId}`;

function Calendar({ save }: { save: SaveFile }) {
  const t = useT();
  const requestedMonth = useSearchParams()?.get("mes") ?? undefined;
  const [open, setOpen] = useState<string | undefined>();
  const [summary, setSummary] = useState<MatchRecord | undefined>();
  const [filter, setFilter] = useState<string>(ALL);
  const [month, setMonth] = useState<string | undefined>(requestedMonth);
  const [selected, setSelected] = useState<string | undefined>();
  const [focusKey, setFocusKey] = useState<string | undefined>();
  return (() => {
    const state = seasonStateOf(save);
    const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
    const all = clubFixtures(state, save.clubId);
    const competitionIds = [...new Set(all.map((fixture) => fixture.competitionId))];
    const nameOf = (competitionId: string) =>
      save.bank.competitions.find((entry) => entry.id === competitionId)?.name ?? "";
    const next = nextFixture(save);
    const filtered = filter === ALL ? all : all.filter((f) => f.competitionId === filter);
    // Os meses seguem a temporada inteira; o filtro só esconde os jogos de outras competições.
    const allMonths = calendarMonths(
      filtered,
      currentDate(save),
      next?.date,
      all.map((fixture) => fixture.date),
    );
    const openKey = monthOfNext(calendarMonths(all, currentDate(save), next?.date), next?.date);
    const monthKey =
      month !== undefined && allMonths.some((entry) => entry.key === month) ? month : openKey;
    const view = allMonths.find((entry) => entry.key === monthKey);
    const rows = filtered.filter((fixture) => fixture.date.startsWith(monthKey ?? "-"));
    const index = allMonths.findIndex((entry) => entry.key === monthKey);
    const goMonth = (delta: number) => {
      const target = allMonths[index + delta];
      if (target) setMonth(target.key);
    };
    const competitionIndex = new Map(competitionIds.map((id, position) => [id, position]));
    const dayFixtures = selected ? filtered.filter((fixture) => fixture.date === selected) : [];
    const selectedFixture = open ? all.find((fixture) => keyOf(fixture) === open) : undefined;
    const detail = selectedFixture
      ? competitionSeason(state, selectedFixture.competitionId).divisions.find(
          (division) => division.divisionLevel === selectedFixture.divisionLevel,
        )
      : undefined;
    const detailRound = selectedFixture ? detail?.calendar[selectedFixture.round - 1] : undefined;
    return (
      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <div className={styles.nav}>
            <Button
              aria-label={t("calendar.prevMonth")}
              disabled={index <= 0}
              onClick={() => goMonth(-1)}
            >
              ‹
            </Button>
            <h2 className={styles.title}>{monthKey ? formatMonthTitle(monthKey) : ""}</h2>
            <Button
              aria-label={t("calendar.nextMonth")}
              disabled={index < 0 || index >= allMonths.length - 1}
              onClick={() => goMonth(1)}
            >
              ›
            </Button>
          </div>
          <Button
            variant="primary"
            disabled={next === undefined}
            title={next === undefined ? t("calendar.goNextDisabled") : undefined}
            onClick={() => {
              if (!next) return;
              setMonth(next.date.slice(0, 7));
              setSelected(next.date);
              setFocusKey(`${next.date}`);
            }}
          >
            {t("calendar.goNext")}
          </Button>
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
        </div>
        <MonthStrip months={allMonths} current={monthKey} onChoose={setMonth} />
        {view ? (
          <div className={styles.board}>
            <div className={styles.gridColumn}>
              <MonthGrid
                month={view}
                clubId={save.clubId}
                clubs={clubs}
                rivalries={save.bank.rivalries}
                competitionIndex={competitionIndex}
                competitionName={nameOf}
                selected={selected}
                focusKey={focusKey}
                onSelect={(date) => {
                  setSelected(date);
                  setFocusKey(undefined);
                }}
                onMonth={goMonth}
              />
              <MonthLegend competitions={competitionIds.map((id) => ({ id, name: nameOf(id) }))} />
            </div>
            <DayPanel
              save={save}
              date={selected}
              fixtures={dayFixtures}
              competitionName={nameOf}
              onSummary={setSummary}
              onRound={(fixture) => setOpen(keyOf(fixture))}
            />
          </div>
        ) : null}
        {rows.length === 0 ? <EmptyState title={t("calendar.noGames")} /> : null}
        {summary ? (
          <Dialog
            open
            dismissOnBackdrop
            title={t("summary.open", {
              home: clubs.get(summary.home)?.shortName ?? "",
              away: clubs.get(summary.away)?.shortName ?? "",
            })}
            onClose={() => setSummary(undefined)}
            actions={
              <>
                {selectedFixture && detailRound ? (
                  <Button onClick={() => setSummary(undefined)}>
                    {t("calendar.backToRound", { round: selectedFixture.round })}
                  </Button>
                ) : null}
                <Button
                  onClick={() => {
                    setSummary(undefined);
                    setOpen(undefined);
                  }}
                >
                  {t("common.close")}
                </Button>
              </>
            }
          >
            <MatchSummary record={summary} save={save} />
          </Dialog>
        ) : selectedFixture && detailRound ? (
          <Dialog
            open
            dismissOnBackdrop
            title={t("calendar.roundMatches", { round: selectedFixture.round })}
            onClose={() => setOpen(undefined)}
            actions={<Button onClick={() => setOpen(undefined)}>{t("common.close")}</Button>}
          >
            <ul className={styles.roundList}>
              {detailRound.fixtures.map((fixture) => {
                const record = detail?.records.find(
                  (entry) => entry.round === selectedFixture.round && entry.home === fixture.home,
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
                    {record ? (
                      <Button
                        aria-label={t("summary.open", {
                          home: clubs.get(fixture.home)?.shortName ?? "",
                          away: clubs.get(fixture.away)?.shortName ?? "",
                        })}
                        onClick={() => setSummary(record)}
                      >
                        {t("summary.button")}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Dialog>
        ) : null}
      </div>
    );
  })();
}

export default function CalendarPage() {
  return <GameLayout>{(save) => <Calendar save={save} />}</GameLayout>;
}
