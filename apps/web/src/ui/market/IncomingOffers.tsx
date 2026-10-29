"use client";

import { formatMarketError } from "@brasfoot-like/i18n";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import type { useGame } from "../../game/GameProvider";
import { formatMoney, useT } from "../../i18n";
import { Button } from "../Button";
import { MoneyInput } from "../MoneyInput";
import styles from "./market.module.css";

type Game = ReturnType<typeof useGame>;

/** Propostas da IA pelos jogadores do usuário: aceitar, recusar ou contrapropor uma vez (US4). */
export function IncomingOffers({
  save,
  game,
  onOpen,
}: {
  save: SaveFile;
  game: Game;
  /** Abre os detalhes do jogador pedido, para decidir entre aceitar e recusar. */
  onOpen: (playerId: string) => void;
}) {
  const t = useT();
  const [counters, setCounters] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const disabled = game.state.live !== undefined;
  const clubName = (clubId: string) =>
    save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "";
  const answer = (
    offerId: string,
    name: string,
    action: Parameters<Game["answerIncomingOffer"]>[1],
  ) => {
    const result = game.answerIncomingOffer(offerId, action);
    if (!result.ok) {
      setMessage(formatMarketError(result.error, "pt-BR"));
      return;
    }
    setMessage(
      result.response === "accepted"
        ? t("market.incoming.response.accepted", { name })
        : t("market.incoming.response.refused"),
    );
  };
  return (
    <section className={styles.card} aria-label={t("market.incoming.title")}>
      <h2>{t("market.incoming.title")}</h2>
      {message ? (
        <p role="status" className={styles.feedback}>
          {message}
        </p>
      ) : null}
      {save.market.incoming.length === 0 ? (
        <p className={styles.muted}>{t("market.incoming.empty")}</p>
      ) : (
        <ul className={styles.list}>
          {save.market.incoming.map((offer) => {
            const player = save.bank.players.find((entry) => entry.id === offer.playerId);
            if (!player) return null;
            return (
              <li key={offer.id}>
                <p>
                  {t(`market.incoming.${offer.kind}`, {
                    club: clubName(offer.fromClubId),
                    fee: formatMoney(offer.fee),
                    name: player.displayName,
                  })}
                </p>
                <p className={styles.muted}>
                  {t("market.incoming.expires", { round: offer.expiresRound })}
                </p>
                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    disabled={disabled}
                    onClick={() => answer(offer.id, player.displayName, { kind: "accept" })}
                  >
                    {t("market.action.accept")}
                  </Button>
                  <Button
                    disabled={disabled}
                    onClick={() => answer(offer.id, player.displayName, { kind: "refuse" })}
                  >
                    {t("market.action.refuse")}
                  </Button>
                  <Button
                    aria-haspopup="dialog"
                    aria-label={t("market.incoming.detailsOf", { name: player.displayName })}
                    onClick={() => onOpen(player.id)}
                  >
                    {t("market.incoming.details")}
                  </Button>
                </div>
                {offer.kind === "buy" ? (
                  <form
                    className={styles.row}
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      answer(offer.id, player.displayName, {
                        kind: "counter",
                        fee: Number(counters[offer.id] ?? offer.fee),
                      });
                    }}
                  >
                    <label className={styles.field}>
                      <span>{t("market.incoming.counterFee")}</span>
                      <MoneyInput
                        value={counters[offer.id] ?? String(offer.fee)}
                        onValueChange={(digits) => setCounters({ ...counters, [offer.id]: digits })}
                      />
                    </label>
                    <Button type="submit" disabled={disabled}>
                      {t("market.incoming.counter")}
                    </Button>
                    <span className={styles.muted}>{t("market.incoming.counterHint")}</span>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
