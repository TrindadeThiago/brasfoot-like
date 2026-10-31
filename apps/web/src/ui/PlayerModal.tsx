"use client";

import { ageOn, clubUnavailability, type MarketRow, marketRowOf } from "@brasfoot-like/engine";
import { formatMarketError } from "@brasfoot-like/i18n";
import {
  currentDate,
  marketContextOf,
  quoteManagerTermination,
  type SaveFile,
  userSeason,
} from "@brasfoot-like/save";
import { useMemo, useState } from "react";
import type { useGame } from "../game/GameProvider";
import { fitnessAt } from "../game/selectors";
import { formatMoney, label, useT } from "../i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { type Disposal, DisposalDialog } from "./DisposalDialog";
import { evolutionText, lastEvolution } from "./evolution-text";
import { Meter } from "./Meter";
import { NegotiationDialog, type NegotiationTarget } from "./market/NegotiationDialog";
import { conditionText } from "./PlayerCondition";
import { PlayerStats } from "./PlayerDetails";
import styles from "./PlayerModal.module.css";

type Game = ReturnType<typeof useGame>;

/**
 * Modal do jogador do elenco (026): detalhes, estatísticas da temporada e as ações Renovar, Vender
 * e Rescindir. Vender e Rescindir abrem o diálogo de cotação; Renovar abre a negociação de
 * contrato do Mercado. Concluída uma venda ou rescisão, o modal fecha e a tela mostra a mensagem.
 */
export function PlayerModal({
  save,
  game,
  playerId,
  onClose,
  onNotice,
}: {
  save: SaveFile;
  game: Game;
  playerId: string | undefined;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const t = useT();
  const [disposal, setDisposal] = useState<Disposal | undefined>();
  const [renewal, setRenewal] = useState<NegotiationTarget | undefined>();
  const player = playerId ? save.bank.players.find((entry) => entry.id === playerId) : undefined;
  // Só a linha deste jogador: montar a lista do mercado inteira custaria uma fração de segundo.
  const context = useMemo(() => (player ? marketContextOf(save) : undefined), [player, save]);
  const row: MarketRow | undefined = useMemo(
    () => (context && playerId ? marketRowOf(context, playerId) : undefined),
    [context, playerId],
  );
  const fitness = useMemo(() => fitnessAt(save), [save]);
  // A cotação do motor decide se a rescisão é possível; o botão segue o que o motor recusa.
  const termination = useMemo(
    () => (player ? quoteManagerTermination(save, player.id) : undefined),
    [player, save],
  );
  if (!player) return null;
  const locked = game.state.live !== undefined;
  const onLoan = player.contract?.loan !== undefined;
  const country = save.bank.countries.find((entry) => entry.id === player.nationalityId);
  const condition = clubUnavailability(userSeason(save), save.bank, save.clubId).find(
    (entry) => entry.playerId === player.id,
  );
  const contract = player.contract;
  const contractText = !contract
    ? t("player.noContract")
    : [
        t(
          contract.untilYear <= save.league.year
            ? "player.contractLastYear"
            : "player.contractUntil",
          { year: contract.untilYear },
        ),
        contract.loan ? t("player.contractLoan") : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
  const traits =
    player.traits.length > 0
      ? player.traits.map((trait) => label(`trait.${trait}`)).join(", ")
      : t("player.noTraits");
  const facts: [string, string][] = [
    ["player.position", label(`position.${player.position}`)],
    ["player.age", t("player.ageValue", { age: ageOn(player.birthDate, currentDate(save)) })],
    ["player.nationality", country?.name ?? ""],
    ["player.traits", traits],
    ["player.contract", contractText],
    ["player.wage", row ? formatMoney(row.wage) : "—"],
    ["player.marketValue", row ? formatMoney(row.value) : "—"],
    ["player.evolution", evolutionText(lastEvolution(save, player.id))],
    ["player.condition", conditionText(t, condition)],
  ];
  const fit = fitness(player.id);
  const reason = locked ? t("player.lockedLive") : undefined;
  const renewReason = reason ?? (onLoan ? t("player.loanNoRenew") : undefined);
  const terminateReason =
    reason ??
    (termination && !termination.ok ? formatMarketError(termination.error, "pt-BR") : undefined);
  const notes = [...new Set([renewReason, terminateReason].filter((note) => note !== undefined))];
  return (
    <>
      <Dialog
        open
        title={player.displayName}
        onClose={onClose}
        actions={
          <>
            <Button
              aria-label={t("squad.renewOf", { name: player.displayName })}
              disabled={renewReason !== undefined || row === undefined}
              onClick={() => row && setRenewal({ kind: "renew", row })}
            >
              {t("squad.renew")}
            </Button>
            <Button
              aria-label={t("squad.sellOf", { name: player.displayName })}
              disabled={locked}
              onClick={() => setDisposal({ kind: "sell", playerId: player.id })}
            >
              {t("squad.sell")}
            </Button>
            <Button
              aria-label={t("squad.terminateOf", { name: player.displayName })}
              disabled={terminateReason !== undefined}
              onClick={() => setDisposal({ kind: "terminate", playerId: player.id })}
            >
              {t("squad.terminate")}
            </Button>
            <Button variant="primary" onClick={onClose}>
              {t("common.close")}
            </Button>
          </>
        }
      >
        <div className={styles.bars}>
          <div>
            <span className={styles.barLabel}>{t("player.strength")}</span>
            <Meter
              value={player.strength}
              label={t("player.strength")}
              text={String(player.strength)}
            />
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
        {notes.map((note) => (
          <p key={note} className={styles.note}>
            {note}
          </p>
        ))}
        <PlayerStats save={save} playerId={player.id} />
      </Dialog>
      <DisposalDialog
        save={save}
        game={game}
        target={disposal}
        onClose={() => setDisposal(undefined)}
        onDone={(message) => {
          onNotice(message);
          onClose();
        }}
      />
      <NegotiationDialog
        save={save}
        game={game}
        target={renewal}
        onClose={() => setRenewal(undefined)}
      />
    </>
  );
}
