"use client";

import type { MarketRow, NegotiationKind } from "@brasfoot-like/engine";
import { formatMarketError } from "@brasfoot-like/i18n";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import type { MarketActionResult, useGame } from "../../game/GameProvider";
import { formatMoney, useT } from "../../i18n";
import { Pager } from "../Pager";
import styles from "./market.module.css";
import { NegotiationBody } from "./NegotiationDialog";

/** Movimentações por página. */
const LOG_PAGE_SIZE = 10;

type Game = ReturnType<typeof useGame>;

/** Negociações em andamento e as movimentações da temporada (US2, US3). */
export function NegotiationsTab({
  save,
  game,
  rows,
}: {
  save: SaveFile;
  game: Game;
  rows: readonly MarketRow[];
}) {
  const t = useT();
  const [message, setMessage] = useState<string | undefined>();
  const [logPage, setLogPage] = useState(0);
  const disabled = game.state.live !== undefined;
  const handle = (result: MarketActionResult, _kind: NegotiationKind) => {
    setMessage(result.ok ? undefined : formatMarketError(result.error, "pt-BR"));
  };
  const clubName = (clubId?: string) =>
    save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "";
  return (
    <div className={styles.layout}>
      <section className={styles.card} aria-label={t("market.negotiations.title")}>
        <h2>{t("market.negotiations.title")}</h2>
        {message ? (
          <p role="alert" className={styles.error}>
            {message}
          </p>
        ) : null}
        {save.market.negotiations.length === 0 ? (
          <p className={styles.muted}>{t("market.negotiations.empty")}</p>
        ) : (
          <ul className={styles.list}>
            {save.market.negotiations.map((negotiation) => {
              const row = rows.find((entry) => entry.playerId === negotiation.playerId);
              if (!row) return null;
              return (
                <li key={negotiation.id}>
                  <h3>
                    {t(`market.negotiations.kind.${negotiation.kind}`)} · {row.displayName}
                  </h3>
                  <NegotiationBody
                    save={save}
                    game={game}
                    negotiation={negotiation}
                    row={row}
                    disabled={disabled}
                    onResult={handle}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section className={styles.card} aria-label={t("market.log.title")}>
        <h2>{t("market.log.title")}</h2>
        {save.market.log.length === 0 ? (
          <p className={styles.muted}>{t("market.log.empty")}</p>
        ) : (
          <ul className={styles.list}>
            {[...save.market.log]
              .reverse()
              .slice(logPage * LOG_PAGE_SIZE, (logPage + 1) * LOG_PAGE_SIZE)
              .map((entry) => (
                <li
                  key={`${entry.playerId}-${entry.kind}-${entry.outcome ?? ""}-${entry.round}-${entry.fee}`}
                >
                  {t(
                    entry.outcome
                      ? `market.log.outcome.${entry.outcome}`
                      : `market.log.${entry.kind}`,
                    {
                      name: entry.displayName,
                      from: clubName(entry.fromClubId),
                      to: clubName(entry.toClubId),
                      fee: formatMoney(entry.fee),
                      round: entry.round,
                    },
                  )}
                </li>
              ))}
          </ul>
        )}
        <Pager
          page={logPage}
          pageSize={LOG_PAGE_SIZE}
          total={save.market.log.length}
          onPage={setLogPage}
        />
      </section>
    </div>
  );
}
