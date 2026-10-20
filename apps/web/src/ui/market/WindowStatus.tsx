"use client";

import {
  currentWindowEnd,
  isWindowOpen,
  marketRules,
  nextWindowRound,
  roundsPlayed,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import styles from "./market.module.css";

/** Estado da janela de transferências e quando abre a próxima (FR-006, FR-007). */
export function WindowStatus({ save }: { save: SaveFile }) {
  const t = useT();
  const rules = marketRules(save.bank, save.league.competitionId);
  const end = currentWindowEnd(save.league, rules);
  const next = nextWindowRound(save.league, rules);
  const open = isWindowOpen(save.league, rules);
  const text = open
    ? t("market.window.open", { round: end ?? roundsPlayed(save.league) })
    : next === undefined
      ? t("market.window.closedNextSeason")
      : t("market.window.closed", { round: next });
  return (
    <p className={styles.status} role="status" data-window={open ? "open" : "closed"}>
      {text}
    </p>
  );
}
