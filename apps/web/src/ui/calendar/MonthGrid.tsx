"use client";

import { type ClubFixture, type Rivalry, rivalryOf } from "@brasfoot-like/engine";
import { type KeyboardEvent, useEffect, useRef } from "react";
import type { CalendarMonth } from "../../game/calendar-month";
import { matchResult } from "../../game/selectors";
import { formatDate, formatMonthTitle, formatWeekdayShort, useT } from "../../i18n";
import styles from "./MonthGrid.module.css";

/** Placar do ponto de vista do clube ("2×1"). */
function goals(
  clubId: string,
  fixture: ClubFixture,
  record: NonNullable<ClubFixture["record"]>,
): string {
  const mine = fixture.home === clubId;
  return mine
    ? `${record.score.home}×${record.score.away}`
    : `${record.score.away}×${record.score.home}`;
}

/**
 * Grade de um mês (027): `role="grid"`, uma célula por dia, com os jogos do clube nos dias de
 * jogo. Setas movem entre os dias, Home/End vão ao início e ao fim da semana, PageUp/PageDown
 * trocam de mês e Enter escolhe o dia. Cor é reforço: resultado e competição sempre em texto.
 */
export function MonthGrid({
  month,
  clubId,
  clubs,
  rivalries,
  competitionIndex,
  competitionName,
  selected,
  focusKey,
  onSelect,
  onMonth,
}: {
  month: CalendarMonth<ClubFixture>;
  clubId: string;
  clubs: ReadonlyMap<string, { shortName: string; name: string }>;
  rivalries: readonly Rivalry[] | undefined;
  /** Posição de cada competição (a faixa de cor dos jogos futuros). */
  competitionIndex: ReadonlyMap<string, number>;
  competitionName: (competitionId: string) => string;
  selected: string | undefined;
  /** Muda para focar um dia (por exemplo, "Ir para o próximo jogo"). */
  focusKey?: string | undefined;
  onSelect: (date: string) => void;
  onMonth: (delta: number) => void;
}) {
  const t = useT();
  const grid = useRef<HTMLDivElement>(null);
  const days = month.weeks.flat();
  const active =
    (selected && days.some((day) => day.date === selected && day.inMonth) ? selected : undefined) ??
    days.find((day) => day.isNext && day.inMonth)?.date ??
    days.find((day) => day.fixtures.length > 0 && day.inMonth)?.date ??
    days.find((day) => day.inMonth)?.date;

  useEffect(() => {
    if (!focusKey) return;
    grid.current?.querySelector<HTMLButtonElement>(`button[data-date="${focusKey}"]`)?.focus();
  }, [focusKey]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, date: string) => {
    const index = days.findIndex((day) => day.date === date);
    const column = index % 7;
    const target: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      ArrowUp: index - 7,
      ArrowDown: index + 7,
      Home: index - column,
      End: index - column + 6,
    };
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      onMonth(event.key === "PageUp" ? -1 : 1);
      return;
    }
    const to = target[event.key];
    if (to === undefined) return;
    event.preventDefault();
    const next = days[to];
    if (next?.inMonth) {
      grid.current?.querySelector<HTMLButtonElement>(`button[data-date="${next.date}"]`)?.focus();
    }
  };

  const head = month.weeks[0] ?? [];
  return (
    <div ref={grid} className={styles.scroll}>
      <table
        aria-label={t("calendar.grid", { month: formatMonthTitle(month.key) })}
        className={styles.grid}
      >
        <thead>
          <tr>
            {head.map((day) => (
              <th key={day.date} scope="col" className={styles.weekday}>
                {formatWeekdayShort(day.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {month.weeks.map((week) => (
            <tr key={week[0]?.date}>
              {week.map((day) => {
                if (!day.inMonth) return <td key={day.date} className={styles.empty} />;
                const isSelected = selected === day.date;
                const classes = [styles.day];
                if (day.fixtures.length > 0) classes.push(styles.game);
                if (isSelected) classes.push(styles.selected);
                if (day.isToday) classes.push(styles.today);
                return (
                  <td key={day.date} className={styles.cell}>
                    <button
                      type="button"
                      data-date={day.date}
                      tabIndex={day.date === active ? 0 : -1}
                      className={classes.join(" ")}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(day.date)}
                      onKeyDown={(event) => move(event, day.date)}
                    >
                      <span className="visually-hidden">
                        {t("calendar.day", {
                          date: formatDate(day.date),
                          games: day.fixtures.length,
                        })}
                        {day.isToday ? `, ${t("calendar.today")}` : ""}
                        {day.isNext ? `, ${t("calendar.nextGame")}` : ""}
                        {day.fixtures.map((fixture) => {
                          const other = clubs.get(
                            fixture.home === clubId ? fixture.away : fixture.home,
                          );
                          const record = fixture.record;
                          const result = record ? matchResult(record, clubId) : undefined;
                          const derby = rivalryOf(
                            { rivalries: rivalries ? [...rivalries] : [] },
                            fixture.home,
                            fixture.away,
                          );
                          return `. ${other?.name ?? ""}${derby ? ` (${t("derby.badge")})` : ""}, ${
                            fixture.home === clubId ? t("calendar.home") : t("calendar.away")
                          }, ${
                            record && result
                              ? `${t(`result.${result}`)} ${goals(clubId, fixture, record)}`
                              : competitionName(fixture.competitionId)
                          }`;
                        })}
                      </span>
                      <span aria-hidden="true" className={styles.visual}>
                        <span className={styles.number}>{Number(day.date.slice(8, 10))}</span>
                        {day.isToday ? (
                          <span className={styles.mark}>{t("calendar.today")}</span>
                        ) : null}
                        {day.isNext ? (
                          <span className={styles.mark}>{t("calendar.nextGame")}</span>
                        ) : null}
                        {day.fixtures.slice(0, 3).map((fixture) => {
                          const other = clubs.get(
                            fixture.home === clubId ? fixture.away : fixture.home,
                          );
                          const record = fixture.record;
                          const result = record ? matchResult(record, clubId) : undefined;
                          const stripe = result
                            ? styles[`r${result}`]
                            : styles[`c${(competitionIndex.get(fixture.competitionId) ?? 0) % 4}`];
                          return (
                            <span
                              key={`${fixture.day}-${fixture.competitionId}`}
                              className={`${styles.chip} ${stripe ?? ""}`}
                            >
                              <span className={styles.opponent}>
                                {fixture.home === clubId ? "" : "@ "}
                                {other?.shortName}
                              </span>
                              <span className={styles.detail}>
                                {record && result
                                  ? `${t(`result.${result}`)} ${goals(clubId, fixture, record)}`
                                  : competitionName(fixture.competitionId)}
                              </span>
                            </span>
                          );
                        })}
                        {day.fixtures.length > 3 ? (
                          <span className={styles.more}>
                            {t("calendar.moreGames", { count: day.fixtures.length - 3 })}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
