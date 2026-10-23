"use client";

import type {
  MarketRow,
  Negotiation,
  NegotiationKind,
  NegotiationStep,
} from "@brasfoot-like/engine";
import { formatMarketError } from "@brasfoot-like/i18n";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import type { MarketActionResult, useGame } from "../../game/GameProvider";
import { formatMoney, label, useT } from "../../i18n";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { MoneyInput } from "../MoneyInput";
import styles from "./market.module.css";

type Game = ReturnType<typeof useGame>;

export interface NegotiationTarget {
  kind: NegotiationKind;
  row: MarketRow;
}

function nameOf(save: SaveFile, clubId?: string): string {
  return save.bank.clubs.find((club) => club.id === clubId)?.shortName ?? "";
}

/** Resultado de uma ação em texto (resposta do clube ou do atleta). */
function feedbackOf(
  t: ReturnType<typeof useT>,
  step: NegotiationStep,
  kind: NegotiationKind,
): string | undefined {
  const { clubResponse, playerResponse, negotiation } = step;
  if (clubResponse?.kind === "refused") {
    return `${t("market.feedback.clubRefused")} ${t(`market.reason.${clubResponse.reason}`)}`;
  }
  if (clubResponse?.kind === "countered") {
    return t("market.feedback.countered", { fee: formatMoney(clubResponse.fee) });
  }
  if (playerResponse?.kind === "refused") {
    return `${t("market.feedback.playerRefused")} ${t(`market.reason.${playerResponse.reason}`)}`;
  }
  if (playerResponse?.kind === "demanded") {
    return t("market.feedback.demanded", { wage: formatMoney(playerResponse.wage) });
  }
  if (!negotiation) {
    return kind === "loan" ? t("market.feedback.loanDone") : t("market.feedback.signed");
  }
  return undefined;
}

/** Painel de uma negociação aberta, com só as ações válidas da etapa atual (US2, US3, US6). */
export function NegotiationBody({
  save,
  game,
  negotiation,
  row,
  disabled,
  onResult,
}: {
  save: SaveFile;
  game: Game;
  negotiation: Negotiation;
  row: Pick<MarketRow, "displayName" | "wage" | "age">;
  disabled: boolean;
  onResult: (result: MarketActionResult, kind: NegotiationKind) => void;
}) {
  const t = useT();
  const [wage, setWage] = useState(String(row.wage));
  const [years, setYears] = useState(row.age >= 33 ? "1" : "3");
  const run = (result: MarketActionResult) => onResult(result, negotiation.kind);
  const seller = nameOf(save, negotiation.fromClubId);
  return (
    <div className={styles.card}>
      <p>{t(`market.stage.${negotiation.stage}`)}</p>
      {negotiation.fee !== undefined && negotiation.kind !== "free" ? (
        <p className={styles.muted}>
          {t("market.negotiation.fee", { fee: formatMoney(negotiation.fee) })}
        </p>
      ) : null}
      {negotiation.stage === "club_countered" && negotiation.counterFee !== undefined ? (
        <>
          <p>
            {t("market.counter.text", {
              club: seller,
              fee: formatMoney(negotiation.counterFee),
              name: row.displayName,
            })}
          </p>
          <div className={styles.actions}>
            <Button
              variant="primary"
              disabled={disabled}
              onClick={() => run(game.answerClubCounter(negotiation.id, true))}
            >
              {t("market.action.accept")}
            </Button>
            <Button
              disabled={disabled}
              onClick={() => run(game.answerClubCounter(negotiation.id, false))}
            >
              {t("market.action.refuse")}
            </Button>
          </div>
        </>
      ) : null}
      {negotiation.stage === "contract" ? (
        <>
          {negotiation.agreedFee !== undefined ? (
            <p>
              {t("market.agreed.text", {
                club: seller,
                fee: formatMoney(negotiation.agreedFee),
                name: row.displayName,
              })}
            </p>
          ) : null}
          <form
            className={styles.row}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              run(
                game.proposeContract(negotiation.id, {
                  wage: Number(wage),
                  years: Number(years),
                }),
              );
            }}
          >
            <label className={styles.field}>
              <span>{t("market.form.wage")}</span>
              <MoneyInput value={wage} onValueChange={setWage} />
            </label>
            <label className={styles.field}>
              <span>{t("market.form.years")}</span>
              <input
                type="number"
                inputMode="numeric"
                value={years}
                onChange={(event) => setYears(event.target.value)}
              />
            </label>
            <Button type="submit" variant="primary" disabled={disabled}>
              {t("market.action.propose")}
            </Button>
          </form>
        </>
      ) : null}
      {negotiation.stage === "player_demanded" && negotiation.demandWage !== undefined ? (
        <>
          <p>
            {t("market.demand.text", {
              name: row.displayName,
              wage: formatMoney(negotiation.demandWage),
            })}
          </p>
          <div className={styles.actions}>
            <Button
              variant="primary"
              disabled={disabled}
              onClick={() => run(game.answerPlayerDemand(negotiation.id, true))}
            >
              {t("market.action.accept")}
            </Button>
            <Button
              disabled={disabled}
              onClick={() => run(game.answerPlayerDemand(negotiation.id, false))}
            >
              {t("market.action.refuse")}
            </Button>
          </div>
        </>
      ) : null}
      <div className={styles.actions}>
        <Button disabled={disabled} onClick={() => game.cancelNegotiation(negotiation.id)}>
          {t("market.action.cancel")}
        </Button>
      </div>
    </div>
  );
}

/** Diálogo de uma negociação: abre com a oferta e segue pelas etapas até concluir ou encerrar. */
export function NegotiationDialog({
  save,
  game,
  target,
  onClose,
}: {
  save: SaveFile;
  game: Game;
  target: NegotiationTarget | undefined;
  onClose: () => void;
}) {
  const t = useT();
  const [fee, setFee] = useState<string | undefined>();
  const [feedback, setFeedback] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [finished, setFinished] = useState(false);
  if (!target) return null;
  const { kind, row } = target;
  const disabled = game.state.live !== undefined;
  const negotiation = save.market.negotiations.find((entry) => entry.playerId === row.playerId);
  const feeValue = fee ?? (kind === "loan" ? "0" : String(row.value));
  const close = () => {
    setFee(undefined);
    setFeedback(undefined);
    setError(undefined);
    setFinished(false);
    onClose();
  };
  const handle = (result: MarketActionResult, resultKind: NegotiationKind) => {
    if (!result.ok) {
      setError(formatMarketError(result.error, "pt-BR"));
      return;
    }
    setError(undefined);
    setFeedback(feedbackOf(t, result.step, resultKind));
    if (!result.step.negotiation) setFinished(true);
  };
  const title = t(`market.dialog.${kind}`, { name: row.displayName });
  const club = row.free ? t("market.free") : nameOf(save, row.clubId);
  return (
    <Dialog
      open
      title={title}
      onClose={close}
      actions={<Button onClick={close}>{t("common.close")}</Button>}
    >
      <p>
        {t("market.dialog.player", {
          position: label(`position.${row.position}`),
          age: row.age,
          strength: row.strength,
          club,
        })}
      </p>
      {!row.free ? <p>{t("market.dialog.askValue", { value: formatMoney(row.value) })}</p> : null}
      {feedback ? (
        <p role="status" className={styles.feedback}>
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      {finished ? null : negotiation ? (
        <NegotiationBody
          save={save}
          game={game}
          negotiation={negotiation}
          row={row}
          disabled={disabled}
          onResult={handle}
        />
      ) : kind === "free" || kind === "renew" ? (
        <Button
          variant="primary"
          disabled={disabled}
          onClick={() => handle(game.startNegotiation({ kind, playerId: row.playerId }), kind)}
        >
          {t("market.action.start")}
        </Button>
      ) : (
        <form
          className={styles.row}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (kind === "buy" || kind === "loan") {
              handle(
                game.startNegotiation({ kind, playerId: row.playerId, fee: Number(feeValue) }),
                kind,
              );
            }
          }}
        >
          <label className={styles.field}>
            <span>{t(kind === "loan" ? "market.form.loanFee" : "market.form.fee")}</span>
            <MoneyInput value={feeValue} onValueChange={setFee} />
          </label>
          <Button type="submit" variant="primary" disabled={disabled}>
            {t(kind === "loan" ? "market.action.loan" : "market.action.offer")}
          </Button>
        </form>
      )}
    </Dialog>
  );
}
