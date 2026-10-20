"use client";

import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { useT } from "../i18n";
import { screenHref } from "./AppHeader";
import styles from "./MarketNotice.module.css";

/** Propostas abertas e contratos do elenco que terminam esta temporada. */
export function marketNoticeCounts(save: SaveFile): { offers: number; expiring: number } {
  return {
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
export function MarketNotice({ save }: { save: SaveFile }) {
  const t = useT();
  const { offers, expiring } = marketNoticeCounts(save);
  if (offers === 0 && expiring === 0) return null;
  return (
    <section aria-label={t("market.notice.title")} className={styles.notice}>
      <h2>{t("market.notice.title")}</h2>
      {offers > 0 ? <p>{t("market.notice.offers", { count: offers })}</p> : null}
      {expiring > 0 ? <p>{t("market.notice.expiring", { count: expiring })}</p> : null}
      <Link href={screenHref("/jogo/mercado", save.id)}>{t("market.notice.open")}</Link>
    </section>
  );
}
