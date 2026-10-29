"use client";

import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useT } from "../i18n";
import { Button } from "./Button";
import styles from "./MarketNotice.module.css";
import { screenHref } from "./shell/screens";

/** Propostas abertas e contratos do elenco que terminam esta temporada. */
export function marketNoticeCounts(save: SaveFile): {
  offers: number;
  expiring: number;
  report: boolean;
} {
  const last = save.market.reports.at(-1);
  return {
    report: last !== undefined && save.market.reportSeen !== last.id,
    offers: save.market.incoming.length,
    expiring: save.bank.players.filter(
      (player) =>
        player.clubId === save.clubId &&
        !player.contract?.loan &&
        (player.contract?.untilYear ?? Number.MAX_SAFE_INTEGER) <= save.league.year,
    ).length,
  };
}

/** Cartão da Início: propostas abertas e contratos que terminam esta temporada (US4, US6). */
export function MarketNotice({
  save,
  onDismissReport,
}: {
  save: SaveFile;
  onDismissReport: () => void;
}) {
  const t = useT();
  const { offers, expiring, report } = marketNoticeCounts(save);
  if (offers === 0 && expiring === 0 && !report) return null;
  const last = save.market.reports.at(-1);
  return (
    <section aria-label={t("market.notice.title")} className={styles.notice}>
      <h2>{t("market.notice.title")}</h2>
      {offers > 0 ? <p>{t("market.notice.offers", { count: offers })}</p> : null}
      {expiring > 0 ? <p>{t("market.notice.expiring", { count: expiring })}</p> : null}
      <Link href={screenHref("/jogo/mercado", save.id)}>{t("market.notice.open")}</Link>
      {report && last ? (
        <>
          <p>{t("market.report.notice", { year: last.year })}</p>
          <div className={styles.actions}>
            <Link href={`${screenHref("/jogo/mercado", save.id)}&aba=report`}>
              {t("market.report.open")}
            </Link>
            <Button onClick={onDismissReport}>{t("market.report.dismiss")}</Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
