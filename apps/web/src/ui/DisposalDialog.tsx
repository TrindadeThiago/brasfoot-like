"use client";

import { formatMarketError } from "@brasfoot-like/i18n";
import { quoteManagerSale, quoteManagerTermination, type SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import type { useGame } from "../game/GameProvider";
import { formatMoney, useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

type Game = ReturnType<typeof useGame>;
export type Disposal = { kind: "sell" | "terminate"; playerId: string };

/**
 * Venda imediata ou rescisão de um jogador do clube: mostra a cotação do motor antes de confirmar
 * (é a mesma que a ação executa) e o erro, se a ação não for possível.
 */
export function DisposalDialog({
  save,
  game,
  target,
  onClose,
  onDone,
}: {
  save: SaveFile;
  game: Game;
  target: Disposal | undefined;
  onClose: () => void;
  /** Texto de confirmação depois de concluir (a tela mostra como aviso). */
  onDone: (message: string) => void;
}) {
  const t = useT();
  const [error, setError] = useState<string | undefined>();
  if (!target) return null;
  const player = save.bank.players.find((entry) => entry.id === target.playerId);
  const name = player?.displayName ?? "";
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const sale = target.kind === "sell" ? quoteManagerSale(save, target.playerId) : undefined;
  const termination =
    target.kind === "terminate" ? quoteManagerTermination(save, target.playerId) : undefined;
  const quote = sale ?? termination;
  const blocked = quote && !quote.ok ? formatMarketError(quote.error, "pt-BR") : undefined;

  const close = () => {
    setError(undefined);
    onClose();
  };
  const confirm = () => {
    if (target.kind === "sell" && sale?.ok) {
      const buyer = clubs.get(sale.quote.buyerClubId)?.name ?? "";
      const result = game.sellPlayer(target.playerId);
      if (!result.ok) return setError(formatMarketError(result.error, "pt-BR"));
      onDone(t("disposal.sold", { name, club: buyer, fee: formatMoney(sale.quote.fee) }));
    } else if (target.kind === "terminate" && termination?.ok) {
      const result = game.terminateContract(target.playerId);
      if (!result.ok) return setError(formatMarketError(result.error, "pt-BR"));
      onDone(t("disposal.terminated", { name, penalty: formatMoney(termination.quote.penalty) }));
    }
    close();
  };

  return (
    <Dialog
      open
      title={t(target.kind === "sell" ? "disposal.sell.title" : "disposal.terminate.title", {
        name,
      })}
      onClose={close}
      actions={
        <>
          <Button onClick={close}>{t("common.cancel")}</Button>
          <Button variant="primary" disabled={quote === undefined || !quote.ok} onClick={confirm}>
            {t(target.kind === "sell" ? "disposal.sell.confirm" : "disposal.terminate.confirm")}
          </Button>
        </>
      }
    >
      {blocked ? <p role="alert">{blocked}</p> : null}
      {sale?.ok ? (
        <>
          <p>
            {t("disposal.sell.offer", {
              club: clubs.get(sale.quote.buyerClubId)?.name ?? "",
              fee: formatMoney(sale.quote.fee),
            })}
          </p>
          <p>{t("disposal.sell.hint", { value: formatMoney(sale.quote.value) })}</p>
        </>
      ) : null}
      {termination?.ok ? (
        <>
          <p>
            {t("disposal.terminate.penalty", {
              penalty: formatMoney(termination.quote.penalty),
              months: termination.quote.monthsLeft,
            })}
          </p>
          <p>{t("disposal.terminate.hint", { wage: formatMoney(termination.quote.wage) })}</p>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </Dialog>
  );
}
