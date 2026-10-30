"use client";

import {
  adequacy,
  FORMATION_IDS,
  FORMATIONS,
  type FormationId,
  fatiguedStrength,
  type LiveMatch,
  type MatchChange,
  matchDrain,
  type PlayerMatchState,
  POSITIONS,
  POSTURES,
  type Posture,
  type Side,
  substitutionCap,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useEffect, useRef, useState } from "react";
import { fitnessAt } from "../game/selectors";
import { label, useT } from "../i18n";
import { FitnessMeter } from "./FitnessMeter";
import { Notice } from "./Notice";
import styles from "./SubstitutionPanel.module.css";

interface PanelProps {
  match: LiveMatch;
  side: Side;
  save: SaveFile;
  onChange(
    change: MatchChange | { type: "formationId"; formation: FormationId },
  ): { ok: true } | { ok: false; code: string; limit?: number };
}

/** Cartões do jogador nesta partida (amarelos e expulsão), com texto para leitor de tela. */
function Cards({ state }: { state: PlayerMatchState | undefined }) {
  const t = useT();
  if (!state) return null;
  if (state.sentOff) {
    return (
      <span
        role="img"
        aria-label={t("round.card.red")}
        className={`${styles.card} ${styles.red}`}
      />
    );
  }
  if (state.yellowCards === 0) return null;
  return (
    <span
      role="img"
      aria-label={t("round.card.yellow", { count: state.yellowCards })}
      className={`${styles.card} ${styles.yellow}`}
    />
  );
}

/**
 * Painel do time durante a pausa (FR-008/FR-009): substituições e trocas de posição em dois
 * passos (escolher um titular, depois um reserva ou outro titular), esquema e postura.
 */
export function SubstitutionPanel({ match, side, save, onChange }: PanelProps) {
  const t = useT();
  const [out, setOut] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const pendingRef = useRef<HTMLButtonElement | null>(null);
  const team = match.state.teams[side];
  const players = new Map(save.bank.players.map((player) => [player.id, player]));
  const name = (id: string) => players.get(id)?.displayName ?? id;
  // Energia ao vivo: a condição de saída menos o desgaste dos minutos em campo (e a força cai junto).
  const { fatigue } = match.state.input;
  const startFitness = fitnessAt(save);
  const squad = new Map(match.state.input[side].squad.map((player) => [player.id, player]));
  const minutesOf = (id: string) => team.players[id]?.minutesPlayed ?? 0;
  const energy = (id: string) => {
    const player = squad.get(id);
    const drained = fatigue && player ? matchDrain(player, minutesOf(id), fatigue) : 0;
    return Math.max(0, startFitness(id) - drained);
  };
  const strengthNow = (id: string) => {
    const player = squad.get(id);
    return player ? fatiguedStrength(player, minutesOf(id), fatigue) : 0;
  };
  // O limite da partida e mais uma na prorrogação (018): o contador mostra o que vale agora.
  const limit = substitutionCap(match.state);
  const unavailable = new Set(match.state.input[side].unavailable ?? []);
  const left = Object.entries(team.players)
    .filter(([, state]) => state.subbedOut !== null || state.sentOff)
    .map(([id]) => id);
  const slots = FORMATIONS[team.formation].slots;
  // Lesionado (ou goleiro expulso) que já saiu da vaga mas ainda espera a troca: ele continua na
  // lista, na vaga dele, para o técnico escolher o substituto antes de o jogo resolver sozinho.
  const waiting = new Map(team.pending.map((entry) => [entry.slotId, entry]));
  const waitingIds = new Set(team.pending.map((entry) => entry.playerId));
  // Quando aparece um substituto obrigatório, o foco vai ao jogador que precisa ser trocado (030 R6).
  useEffect(() => {
    if (team.pending.length > 0) pendingRef.current?.focus();
  }, [team.pending.length]);
  // Reservas na ordem das posições (GOL, LAT, ZAG…), do mais forte ao mais fraco.
  const rank = (id: string) => POSITIONS.indexOf(players.get(id)?.position ?? "MF");
  const benchInOrder = [...team.bench].sort(
    (a, b) =>
      rank(a) - rank(b) || (players.get(b)?.strength ?? 0) - (players.get(a)?.strength ?? 0),
  );

  const report = (
    result: { ok: true } | { ok: false; code: string; limit?: number },
    done: string,
  ) => {
    if (result.ok) setMessage(done);
    else
      setMessage(
        result.code.startsWith("change.")
          ? t(`round.error.${result.code}`, { limit: result.limit ?? limit })
          : t("round.error.generic"),
      );
  };

  // Dois titulares trocam de vaga: mesma formação, outra distribuição (não gasta substituição).
  const swapWith = (otherId: string) => {
    if (!out) return;
    const slotOf = (playerId: string) =>
      Object.entries(team.onField).find(([, id]) => id === playerId)?.[0];
    const first = slotOf(out);
    const second = slotOf(otherId);
    if (!first || !second) return;
    const result = onChange({
      type: "formation",
      formation: team.formation,
      assignment: { ...team.onField, [first]: otherId, [second]: out },
    });
    report(result, t("round.swapDone", { first: name(out), second: name(otherId) }));
    setOut(undefined);
  };

  const chooseIn = (inId: string) => {
    if (!out) return;
    const result = onChange({ type: "substitution", out, in: inId });
    report(result, t("round.substitutionDone", { in: name(inId), out: name(out) }));
    setOut(undefined);
  };

  return (
    <section aria-label={t("round.panel")} className={styles.panel}>
      <h2>{t("round.panel")}</h2>
      {team.pending.length > 0 ? (
        <Notice tone="warning" title={t("round.pendingTitle")}>
          <p>
            {t("round.pendingBody", {
              players: team.pending.map((entry) => name(entry.playerId)).join(", "),
            })}
          </p>
        </Notice>
      ) : null}
      <div className={styles.controls}>
        <label>
          <span>{t("round.formation")}</span>
          <select
            value={team.formation}
            onChange={(event) =>
              report(
                onChange({ type: "formationId", formation: event.target.value as FormationId }),
                "",
              )
            }
          >
            {FORMATION_IDS.map((formation) => (
              <option key={formation} value={formation}>
                {label(`formation.${formation}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t("round.posture")}</span>
          <select
            value={team.posture}
            onChange={(event) =>
              report(onChange({ type: "posture", posture: event.target.value as Posture }), "")
            }
          >
            {POSTURES.map((posture) => (
              <option key={posture} value={posture}>
                {label(`posture.${posture}`)}
              </option>
            ))}
          </select>
        </label>
        <span className={styles.count}>
          {t("round.substitutionsLeft", { used: team.substitutionsUsed, limit })}
        </span>
      </div>
      <p role="status" className={styles.message}>
        {message || (out ? t("round.selectOut", { name: name(out) }) : "")}
      </p>
      <div className={styles.columns}>
        <div>
          <h3>{t("round.onField")}</h3>
          <ul>
            {slots.map((slot) => {
              const id = team.onField[slot.id];
              const pending = waiting.get(slot.id);
              if (!id && pending) {
                return (
                  <li key={slot.id}>
                    <button
                      type="button"
                      ref={team.pending[0]?.slotId === slot.id ? pendingRef : undefined}
                      aria-pressed={out === pending.playerId}
                      className={`${styles.row} ${out === pending.playerId ? styles.selected : ""}`}
                      onClick={() =>
                        setOut(out === pending.playerId ? undefined : pending.playerId)
                      }
                    >
                      <span className={styles.position}>{label(`position.${slot.position}`)}</span>
                      <span className={styles.name}>{name(pending.playerId)}</span>
                      <Cards state={team.players[pending.playerId]} />
                      <span className={styles.natural}>{t(`round.pending.${pending.reason}`)}</span>
                    </button>
                  </li>
                );
              }
              if (!id) return null;
              const player = players.get(id);
              const factor = player ? adequacy(player.position, slot.position) : 1;
              const outOfPosition = player !== undefined && player.position !== slot.position;
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    aria-pressed={out === id}
                    className={`${styles.row} ${out === id ? styles.selected : ""}`}
                    onClick={() => {
                      if (out === id) setOut(undefined);
                      else if (out && !waitingIds.has(out)) swapWith(id);
                      else setOut(id);
                    }}
                  >
                    <span className={styles.position}>{label(`position.${slot.position}`)}</span>
                    <span className={styles.name}>{name(id)}</span>
                    <Cards state={team.players[id]} />
                    {outOfPosition ? (
                      <span className={styles.natural}>
                        {t("lineup.natural", { position: label(`position.${player.position}`) })}
                      </span>
                    ) : null}
                    <span className={styles.energy}>
                      <FitnessMeter value={energy(id)} />
                    </span>
                    <span className={styles.strength}>{Math.round(strengthNow(id) * factor)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3>{t("round.bench")}</h3>
          <ul>
            {benchInOrder
              .filter((id) => !unavailable.has(id))
              .map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    className={styles.row}
                    disabled={!out}
                    onClick={() => chooseIn(id)}
                  >
                    <span className={styles.position}>
                      {label(`position.${players.get(id)?.position ?? "MF"}`)}
                    </span>
                    <span className={styles.name}>{name(id)}</span>
                    <span className={styles.energy}>
                      <FitnessMeter value={energy(id)} />
                    </span>
                    <span className={styles.strength}>{strengthNow(id)}</span>
                  </button>
                </li>
              ))}
          </ul>
          <h3>{t("round.substituted")}</h3>
          <ul aria-label={t("round.substituted")} className={styles.left}>
            {left.map((id) => (
              <li key={id}>
                <span>{name(id)}</span>
                <Cards state={team.players[id]} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
