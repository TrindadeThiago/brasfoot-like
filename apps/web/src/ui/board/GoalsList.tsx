"use client";

import { goalProgress, type SeasonGoals } from "@brasfoot-like/engine";
import { boardContextOf, type SaveFile } from "@brasfoot-like/save";
import { formatMoney, useT } from "../../i18n";
import styles from "./board.module.css";

/** Texto da meta financeira (frase completa por tipo). */
export function financeGoalText(t: ReturnType<typeof useT>, goals: SeasonGoals): string {
  return t(`board.goal.finance.${goals.finance.kind}`, {
    amount: formatMoney(goals.finance.startCash),
  });
}

/** Metas da temporada do clube do técnico, com o andamento de cada uma (FR-011). */
export function GoalsList({ save }: { save: SaveFile }) {
  const t = useT();
  const clubId = save.board.manager.clubId;
  const goals = clubId ? save.board.clubs[clubId]?.goals : undefined;
  const progress = clubId ? goalProgress(boardContextOf(save), clubId) : undefined;
  if (!goals || !progress) return <p className={styles.muted}>{t("board.noGoals")}</p>;
  return (
    <ul className={styles.list}>
      <li className={styles.goal}>
        <span className={styles.muted}>{t("board.goal.sport")}</span>
        <strong>{t(`board.goal.tier.${goals.sport.tier}`)}</strong>
        <span>{t("board.goal.position", { position: progress.sport.required })}</span>
        <span>{t("board.goal.current", { position: progress.sport.current })}</span>
        <span className={progress.sport.met ? styles.met : styles.risk}>
          {progress.sport.met ? t("board.goal.met") : t("board.goal.atRisk")}
        </span>
      </li>
      <li className={styles.goal}>
        <span className={styles.muted}>{t("board.goal.finance")}</span>
        <strong>{financeGoalText(t, goals)}</strong>
        <span className={progress.finance.met ? styles.met : styles.risk}>
          {progress.finance.met ? t("board.goal.met") : t("board.goal.atRisk")}
        </span>
      </li>
      {goals.sport.midSeason ? <li className={styles.muted}>{t("board.goal.midSeason")}</li> : null}
    </ul>
  );
}
