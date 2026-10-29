"use client";

import { economyRules } from "@brasfoot-like/engine";
import { formatFinanceError } from "@brasfoot-like/i18n";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import type { FinanceActionResult } from "../game/GameProvider";
import { formatMoney, formatNumber, useT } from "../i18n";
import { Button } from "./Button";
import styles from "./FinancePanel.module.css";

/** Ampliação do estádio: opções com custo e duração, ou a obra em andamento (US6, FR-018). */
export function StadiumPanel({
  save,
  disabled,
  onStart,
}: {
  save: SaveFile;
  disabled: boolean;
  onStart: (optionIndex: number) => FinanceActionResult;
}) {
  const t = useT();
  const [error, setError] = useState<string | undefined>();
  const club = save.finances.clubs[save.clubId];
  const { stadium } = economyRules(save.bank, save.league.competitionId);
  if (!club) return null;
  const atMax = stadium.options.every(
    (option) => club.capacity + option.seats > stadium.maxCapacity,
  );
  return (
    <section aria-label={t("finance.stadium.title")} className={styles.card}>
      <h2>{t("finance.stadium.title")}</h2>
      <p>{t("finance.capacityValue", { seats: formatNumber(club.capacity) })}</p>
      {club.works ? (
        <p>
          {t("finance.stadium.inProgress", {
            seats: formatNumber(club.works.seats),
            remaining: club.works.remainingRounds,
          })}
        </p>
      ) : atMax ? (
        <p className={styles.muted}>{t("finance.stadium.atMax")}</p>
      ) : (
        <ul className={styles.options}>
          {stadium.options.map((option, index) => {
            const tooBig = club.capacity + option.seats > stadium.maxCapacity;
            const tooExpensive = option.cost > club.cash;
            const label = t("finance.stadium.option", {
              seats: formatNumber(option.seats),
              cost: formatMoney(option.cost),
              rounds: option.rounds,
            });
            return (
              <li key={option.seats}>
                <span>
                  {label}
                  <span className={styles.muted}>
                    {" · "}
                    {t("finance.stadium.after", {
                      seats: formatNumber(club.capacity + option.seats),
                    })}
                  </span>
                </span>
                {tooExpensive ? (
                  <span className={styles.muted}>{t("finance.stadium.cantAfford")}</span>
                ) : null}
                <Button
                  aria-label={t("finance.stadium.startOption", { option: label })}
                  disabled={disabled || tooBig || tooExpensive}
                  onClick={() => {
                    const result = onStart(index);
                    setError(result.ok ? undefined : formatFinanceError(result.error, "pt-BR"));
                  }}
                >
                  {t("finance.stadium.start")}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
