"use client";

import {
  isWindowOpen,
  marketRules,
  roundsPlayed,
  transferWindows,
  windowDates,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { formatDate, useT } from "../../i18n";
import styles from "./market.module.css";

/** Estado da janela de transferências e quando abre a próxima, em datas (FR-006, FR-007, 017). */
export function WindowStatus({ save }: { save: SaveFile }) {
  const t = useT();
  const rules = marketRules(save.bank, save.league.competitionId);
  const windows = transferWindows(save.league, rules);
  const dates = windowDates(save.calendar, save.league.competitionId, windows);
  const played = roundsPlayed(save.league);
  const open = isWindowOpen(save.league, rules);
  const current = windows.findIndex(
    (entry) => played >= entry.fromRound && played <= entry.toRound,
  );
  const next = windows.findIndex((entry) => entry.fromRound > played);
  const text = open
    ? t("market.window.open", { date: formatDate(dates[current]?.closesOn ?? save.calendar.end) })
    : next < 0
      ? t("market.window.closedNextSeason")
      : t("market.window.closed", { date: formatDate(dates[next]?.opensOn ?? save.calendar.end) });
  return (
    <p className={styles.status} role="status" data-window={open ? "open" : "closed"}>
      {text}
    </p>
  );
}
