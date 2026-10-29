"use client";

import type { SaveFile } from "@brasfoot-like/save";
import { formatMoney, formatNumber, useT } from "../../i18n";
import { Notice } from "../Notice";
import styles from "./finance.module.css";

/**
 * Resumo fixo das Finanças (028), acima das abas: saldo, resultado da temporada, dívida e
 * estádio, o aviso de crise e o de rodada ao vivo.
 */
export function FinanceHeader({ save, locked }: { save: SaveFile; locked: boolean }) {
  const t = useT();
  const club = save.finances.clubs[save.clubId];
  if (!club) return null;
  const result = club.cash - club.seasonStartCash;
  return (
    <div className={styles.header}>
      <dl className={styles.facts}>
        <div>
          <dt>{t("finance.balance")}</dt>
          <dd className={`${styles.big} ${club.cash < 0 ? styles.negative : ""}`}>
            {formatMoney(club.cash)}
          </dd>
        </div>
        <div>
          <dt>{t("finance.result")}</dt>
          <dd className={result < 0 ? styles.negative : undefined}>{formatMoney(result)}</dd>
        </div>
        <div>
          <dt>{t("finance.debt")}</dt>
          <dd>{formatMoney(club.debt)}</dd>
        </div>
        <div>
          <dt>{t("finance.capacity")}</dt>
          <dd>{t("finance.capacityValue", { seats: formatNumber(club.capacity) })}</dd>
        </div>
      </dl>
      {club.inCrisis ? (
        <p role="alert" className={styles.crisis}>
          {t("finance.crisis", { rounds: club.negativeRounds })}
        </p>
      ) : null}
      {locked ? (
        <Notice tone="info" title={t("finance.title")}>
          <p>{t("finance.liveLocked")}</p>
        </Notice>
      ) : null}
    </div>
  );
}
