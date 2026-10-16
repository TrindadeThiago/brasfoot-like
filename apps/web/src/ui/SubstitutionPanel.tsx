"use client";

import {
  adequacy,
  FORMATION_IDS,
  FORMATIONS,
  type FormationId,
  type LiveMatch,
  type MatchChange,
  POSTURES,
  type Posture,
  type Side,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useState } from "react";
import { label, useT } from "../i18n";
import styles from "./SubstitutionPanel.module.css";

interface PanelProps {
  match: LiveMatch;
  side: Side;
  save: SaveFile;
  onChange(
    change: MatchChange | { type: "formationId"; formation: FormationId },
  ): { ok: true } | { ok: false; code: string; limit?: number };
}

/** Painel do time durante a pausa: substituições (dois passos), esquema e postura (FR-008/FR-009). */
export function SubstitutionPanel({ match, side, save, onChange }: PanelProps) {
  const t = useT();
  const [out, setOut] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const team = match.state.teams[side];
  const players = new Map(save.bank.players.map((player) => [player.id, player]));
  const name = (id: string) => players.get(id)?.displayName ?? id;
  const limit = match.state.input.substitutionLimit;
  const unavailable = new Set(match.state.input[side].unavailable ?? []);
  const left = Object.entries(team.players)
    .filter(([, state]) => state.subbedOut !== null || state.sentOff)
    .map(([id]) => id);
  const slots = FORMATIONS[team.formation].slots;

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

  const chooseIn = (inId: string) => {
    if (!out) return;
    const result = onChange({ type: "substitution", out, in: inId });
    report(result, t("round.substitutionDone", { in: name(inId), out: name(out) }));
    setOut(undefined);
  };

  return (
    <section aria-label={t("round.panel")} className={styles.panel}>
      <h2>{t("round.panel")}</h2>
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
              if (!id) return null;
              const player = players.get(id);
              const factor = player ? adequacy(player.position, slot.position) : 1;
              return (
                <li key={slot.id}>
                  <button
                    type="button"
                    aria-pressed={out === id}
                    className={`${styles.row} ${out === id ? styles.selected : ""}`}
                    onClick={() => setOut(out === id ? undefined : id)}
                  >
                    <span className={styles.position}>{label(`position.${slot.position}`)}</span>
                    <span>{name(id)}</span>
                    <span className={styles.strength}>
                      {Math.round((player?.strength ?? 0) * factor)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h3>{t("round.bench")}</h3>
          <ul>
            {team.bench
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
                    <span>{name(id)}</span>
                    <span className={styles.strength}>{players.get(id)?.strength}</span>
                  </button>
                </li>
              ))}
          </ul>
          <h3>{t("round.substituted")}</h3>
          <ul aria-label={t("round.substituted")} className={styles.left}>
            {left.map((id) => (
              <li key={id}>{name(id)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
