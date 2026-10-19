"use client";

import { economyRules, nextHomeGateEstimate } from "@brasfoot-like/engine";
import { formatFinanceError } from "@brasfoot-like/i18n";
import type { SaveFile } from "@brasfoot-like/save";
import { type FormEvent, useState } from "react";
import type { FinanceActionResult } from "../game/GameProvider";
import { formatMoney, formatNumber, useT } from "../i18n";
import { Button } from "./Button";
import styles from "./FinancePanel.module.css";

/** Preço do ingresso com a estimativa do próximo jogo em casa (US2, FR-016, FR-017). */
export function TicketPrice({
  save,
  disabled,
  onApply,
}: {
  save: SaveFile;
  disabled: boolean;
  onApply: (price: number) => FinanceActionResult;
}) {
  const t = useT();
  const finance = save.finances.clubs[save.clubId];
  const { min, max } = economyRules(save.bank, save.league.competitionId).priceRange;
  const [value, setValue] = useState(String(finance?.ticketPrice ?? min));
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | undefined>();
  const price = Number(value);
  const valid = Number.isInteger(price) && price >= min && price <= max;
  const estimate = valid
    ? nextHomeGateEstimate(save.finances, save.league, save.bank, save.clubId, price)
    : undefined;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = onApply(price);
    setMessage(
      result.ok
        ? { kind: "ok", text: t("finance.ticket.applied") }
        : { kind: "error", text: formatFinanceError(result.error, "pt-BR") },
    );
  };
  return (
    <section aria-label={t("finance.ticket.title")} className={styles.card}>
      <h2>{t("finance.ticket.title")}</h2>
      <p>{t("finance.ticket.current", { price: formatMoney(finance?.ticketPrice ?? 0) })}</p>
      <form className={styles.row} onSubmit={submit} noValidate>
        <label className={styles.field}>
          <span>{t("finance.ticket.price", { min, max })}</span>
          <input
            type="number"
            inputMode="numeric"
            value={value}
            min={min}
            max={max}
            onChange={(event) => {
              setValue(event.target.value);
              setMessage(undefined);
            }}
          />
        </label>
        <Button type="submit" variant="primary" disabled={disabled}>
          {t("finance.ticket.apply")}
        </Button>
      </form>
      <p className={styles.muted}>
        {estimate
          ? t("finance.ticket.estimate", {
              attendance: formatNumber(estimate.attendance),
              occupancy: Math.round((100 * estimate.attendance) / Math.max(1, estimate.capacity)),
              revenue: formatMoney(estimate.revenue),
            })
          : valid
            ? t("finance.ticket.noHomeGame")
            : ""}
      </p>
      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={message.kind === "error" ? styles.error : undefined}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
