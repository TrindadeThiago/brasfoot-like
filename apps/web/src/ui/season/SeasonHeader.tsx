"use client";

import { useT } from "../../i18n";
import { Button } from "../Button";
import styles from "./SeasonHeader.module.css";

/** Título da temporada com o botão Próxima temporada na mesma linha; a falha aparece logo abaixo (030). */
export function SeasonHeader({
  year,
  state,
  onNext,
}: {
  year: number;
  state: "idle" | "busy" | "failed";
  onNext: () => void;
}) {
  const t = useT();
  return (
    <div className={styles.header}>
      <div className={styles.row}>
        <h2 className="screen-title">{t("seasonEnd.title", { year })}</h2>
        <Button variant="primary" onClick={onNext} disabled={state === "busy"}>
          {state === "busy" ? t("seasonEnd.preparing") : t("seasonEnd.next")}
        </Button>
      </div>
      {state === "failed" ? <p role="alert">{t("seasonEnd.failed")}</p> : null}
    </div>
  );
}
