"use client";

import { creditLine } from "@brasfoot-like/engine";
import { formatFinanceError } from "@brasfoot-like/i18n";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import type { FinanceActionResult } from "../game/GameProvider";
import { formatMoney, useT } from "../i18n";
import { Button } from "./Button";
import styles from "./FinancePanel.module.css";
import { MoneyInput } from "./MoneyInput";

/** Crédito bancário: limite, custo e as ações de tomar, amortizar e quitar (US5, FR-013 a FR-015). */
export function CreditPanel({
  save,
  disabled,
  onTake,
  onRepay,
}: {
  save: SaveFile;
  disabled: boolean;
  onTake: (amount: number) => FinanceActionResult;
  onRepay: (amount: number) => FinanceActionResult;
}) {
  const t = useT();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  const debt = save.finances.clubs[save.clubId]?.debt ?? 0;
  const line = creditLine(save.finances, save.league, save.bank, save.clubId);
  const run = (action: (amount: number) => FinanceActionResult, amount: number) => {
    const result = action(amount);
    if (result.ok) {
      setError(undefined);
      setValue("");
    } else {
      setError(formatFinanceError(result.error, "pt-BR"));
    }
  };
  const amount = Number(value);
  return (
    <section aria-label={t("finance.credit.title")} className={styles.card}>
      <h2>{t("finance.credit.title")}</h2>
      <p>
        {t("finance.credit.limit", {
          limit: formatMoney(line.limit),
          available: formatMoney(line.available),
        })}
      </p>
      <p className={styles.muted}>
        {t("finance.credit.rate", {
          rate: (line.interestBp / 100).toLocaleString("pt-BR"),
          perRound: formatMoney(line.interestPerRound),
        })}
      </p>
      <div className={`${styles.row} ${styles.rowHint}`}>
        <label className={styles.field}>
          <span>{t("finance.credit.amount")}</span>
          <MoneyInput
            value={value}
            onValueChange={(digits) => {
              setValue(digits);
              setError(undefined);
            }}
          />
        </label>
        <Button variant="primary" disabled={disabled} onClick={() => run(onTake, amount)}>
          {t("finance.credit.take")}
        </Button>
        <Button disabled={disabled || debt === 0} onClick={() => run(onRepay, amount)}>
          {t("finance.credit.repay")}
        </Button>
        <Button disabled={disabled || debt === 0} onClick={() => run(onRepay, debt)}>
          {t("finance.credit.settle")}
        </Button>
      </div>
      {debt === 0 ? <p className={styles.muted}>{t("finance.credit.noDebt")}</p> : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
