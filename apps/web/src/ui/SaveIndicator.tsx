"use client";

import { useGame } from "../game/GameProvider";
import { useT } from "../i18n";
import styles from "./SaveIndicator.module.css";

/** Indicador discreto do salvamento automático (FR-011). */
export function SaveIndicator() {
  const t = useT();
  const { state } = useGame();
  if (state.saving === "failed") {
    return (
      <span role="alert" className={`${styles.indicator} ${styles.failed}`}>
        {t(state.savingMessage ?? "saving.failed")}
      </span>
    );
  }
  return (
    <span aria-live="polite" className={styles.indicator}>
      {state.saving === "saving"
        ? t("saving.saving")
        : state.saving === "saved"
          ? t("saving.saved")
          : ""}
    </span>
  );
}
