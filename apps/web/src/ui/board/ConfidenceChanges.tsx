"use client";

import type { ConfidenceChange } from "@brasfoot-like/engine";
import { roundChanges } from "../../game/board-view";
import { useT } from "../../i18n";
import { Card } from "../Card";
import styles from "./board.module.css";

/** Mudanças de confiança por rodada, da mais nova à mais antiga, num quadro que rola sozinho (029 R2). */
export function ConfidenceChanges({ recent }: { recent: readonly ConfidenceChange[] }) {
  const t = useT();
  const changes = roundChanges(recent);
  return (
    <Card className={styles.panel}>
      <h2 className={styles.heading}>{t("board.history")}</h2>
      {changes.length === 0 ? (
        <p className={styles.muted}>{t("board.noReasons")}</p>
      ) : (
        // biome-ignore lint/a11y/useSemanticElements: quadro rolante com nome e foco por teclado
        // biome-ignore lint/a11y/noNoninteractiveTabindex: quem não usa mouse precisa rolar a lista
        <div role="region" aria-label={t("board.history")} tabIndex={0} className={styles.scroller}>
          <ul className={styles.list}>
            {changes.map((change) => (
              <li key={`${change.season}-${change.round}-${change.value}`}>
                {t("board.historyRound", { round: change.round })}:{" "}
                {t("board.historyValue", { value: change.value, delta: change.delta })} —{" "}
                {change.factors
                  .map((factor) => t(`board.factor.${factor.kind}`, { amount: factor.amount }))
                  .join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
