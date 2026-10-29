"use client";

import { ageOn, clubUnavailability, type MarketRow } from "@brasfoot-like/engine";
import { currentDate, type SaveFile, userSeason } from "@brasfoot-like/save";
import { useMemo } from "react";
import { fitnessAt } from "../../game/selectors";
import { formatMoney, label, useT } from "../../i18n";
import { Button } from "../Button";
import { Dialog } from "../Dialog";
import { evolutionText, lastEvolution } from "../evolution-text";
import { Meter } from "../Meter";
import { conditionText } from "../PlayerCondition";
import { PlayerStats } from "../PlayerDetails";
import styles from "./MarketPlayerModal.module.css";

export type MarketAction = "buy" | "loan" | "free";

/**
 * Modal do jogador no Mercado (028): detalhes só com atributos visíveis e as ações Fazer oferta e
 * Pedir empréstimo (ou Contratar, se é livre), Adicionar à comparação e Fechar. As ofertas abrem o
 * diálogo de negociação por cima; a trava (rodada ao vivo) aparece escrita e desativa os botões.
 */
export function MarketPlayerModal({
  save,
  row,
  locked,
  compared,
  compareFull,
  onAction,
  onToggleCompare,
  onClose,
}: {
  save: SaveFile;
  row: MarketRow | undefined;
  locked: boolean;
  compared: boolean;
  /** A comparação já tem o máximo de jogadores (e este não está nela). */
  compareFull: boolean;
  onAction: (row: MarketRow, action: MarketAction) => void;
  onToggleCompare: (playerId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const fitness = useMemo(() => fitnessAt(save), [save]);
  if (!row) return null;
  const player =
    save.bank.players.find((entry) => entry.id === row.playerId) ??
    save.market.freeAgents.find((agent) => agent.player.id === row.playerId)?.player;
  const country = save.bank.countries.find((entry) => entry.id === player?.nationalityId);
  const club = save.bank.clubs.find((entry) => entry.id === row.clubId);
  const condition = clubUnavailability(userSeason(save), save.bank, row.clubId ?? "").find(
    (entry) => entry.playerId === row.playerId,
  );
  const own = row.clubId === save.clubId;
  const fit = fitness(row.playerId);
  const facts: [string, string][] = [
    ["player.position", label(`position.${row.position}`)],
    [
      "player.age",
      t("player.ageValue", { age: player ? ageOn(player.birthDate, currentDate(save)) : row.age }),
    ],
    ["player.nationality", country?.name ?? ""],
    [
      "player.traits",
      row.traits.length > 0
        ? row.traits.map((trait) => label(`trait.${trait}`)).join(", ")
        : t("player.noTraits"),
    ],
    ["market.modal.club", row.free ? t("market.free") : (club?.name ?? "")],
    [
      "player.contract",
      row.untilYear ? t("player.contractUntil", { year: row.untilYear }) : t("player.noContract"),
    ],
    ["player.marketValue", row.free ? "—" : formatMoney(row.value)],
    ["player.wage", formatMoney(row.wage)],
    ["player.evolution", evolutionText(lastEvolution(save, row.playerId))],
    ["player.condition", conditionText(t, condition)],
  ];
  const canOffer = !own && !row.onLoan;
  return (
    <Dialog
      open
      title={row.displayName}
      onClose={onClose}
      dismissOnBackdrop
      actions={
        <>
          {canOffer && row.free ? (
            <Button variant="primary" disabled={locked} onClick={() => onAction(row, "free")}>
              {t("market.action.sign")}
            </Button>
          ) : null}
          {canOffer && !row.free ? (
            <>
              <Button variant="primary" disabled={locked} onClick={() => onAction(row, "buy")}>
                {t("market.action.offer")}
              </Button>
              <Button disabled={locked} onClick={() => onAction(row, "loan")}>
                {t("market.action.loan")}
              </Button>
            </>
          ) : null}
          {own ? null : (
            <Button
              aria-pressed={compared}
              disabled={compareFull && !compared}
              onClick={() => onToggleCompare(row.playerId)}
            >
              {t(compared ? "market.modal.removeCompare" : "market.modal.addCompare")}
            </Button>
          )}
          <Button onClick={onClose}>{t("common.close")}</Button>
        </>
      }
    >
      <div className={styles.bars}>
        <div>
          <span className={styles.barLabel}>{t("player.strength")}</span>
          <Meter value={row.strength} label={t("player.strength")} text={String(row.strength)} />
        </div>
        <div>
          <span className={styles.barLabel}>{t("player.condition")}</span>
          <Meter
            value={fit}
            label={t("fitness.label")}
            text={t("fitness.value", { value: fit })}
            tone={fit < 50 ? "danger" : fit < 75 ? "warning" : "accent"}
          />
        </div>
      </div>
      <dl className={styles.list}>
        {facts.map(([key, value]) => (
          <div key={key} className={styles.row}>
            <dt>{t(key)}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {row.onLoan && !own ? <p className={styles.note}>{t("market.onLoan")}</p> : null}
      {locked && canOffer ? <p className={styles.note}>{t("market.liveLocked")}</p> : null}
      {!own && compareFull && !compared ? (
        <p className={styles.note}>{t("market.tray.limit", { max: 4 })}</p>
      ) : null}
      <PlayerStats save={save} playerId={row.playerId} />
    </Dialog>
  );
}
