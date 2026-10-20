"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import styles from "./board.module.css";
import { financeGoalText } from "./GoalsList";

/** Avaliação de fim de temporada da diretoria (FR-018), na tela de Fim de temporada. */
export function Evaluation({ save }: { save: SaveFile }) {
  const t = useT();
  const evaluation = save.board.evaluation;
  const goals = evaluation ? save.board.clubs[evaluation.clubId]?.goals : undefined;
  if (!evaluation) return null;
  return (
    <section aria-label={t("board.title")} className={styles.card}>
      <h2>{t("board.evaluation.title", { year: save.league.year })}</h2>
      <ul className={styles.list}>
        <li>
          {t("board.evaluation.sport", {
            tier: t(`board.goal.tier.${evaluation.sport.tier}`),
            required: evaluation.sport.required,
            final: evaluation.sport.final,
          })}{" "}
          <span className={evaluation.sport.met ? styles.met : styles.risk}>
            {evaluation.sport.met ? t("board.evaluation.met") : t("board.evaluation.missed")}
          </span>
        </li>
        <li>
          {goals ? financeGoalText(t, goals) : t(`board.goal.finance.${evaluation.finance.kind}`)}{" "}
          <span className={evaluation.finance.met ? styles.met : styles.risk}>
            {evaluation.finance.met ? t("board.evaluation.met") : t("board.evaluation.missed")}
          </span>
        </li>
        {evaluation.achievements.map((achievement) => (
          <li key={achievement}>{t(`board.evaluation.achievement.${achievement}`)}</li>
        ))}
      </ul>
      <p>{t("board.evaluation.confidence", { value: evaluation.finalConfidence })}</p>
      <p className={evaluation.decision === "kept" ? styles.met : styles.risk}>
        {t(`board.evaluation.decision.${evaluation.decision}`)}
      </p>
      <p>
        {t("board.evaluation.reputation", {
          before: evaluation.reputationBefore,
          after: evaluation.reputationAfter,
        })}
      </p>
    </section>
  );
}
