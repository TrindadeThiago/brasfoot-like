"use client";

import {
  adequacy,
  type CompletedPlayer,
  FORMATIONS,
  type Lineup,
  type Place,
  type Position,
  type Unavailability,
} from "@brasfoot-like/engine";
import { label, useT } from "../i18n";
import styles from "./Pitch.module.css";
import { Condition } from "./PlayerCondition";

const LINES: readonly (readonly Position[])[] = [["FW"], ["DM", "MF"], ["FB", "CB"], ["GK"]];

interface PitchProps {
  lineup: Lineup;
  players: ReadonlyMap<string, CompletedPlayer>;
  unavailable: ReadonlyMap<string, Unavailability>;
  selected?: Place | undefined;
  onSelect(place: Place): void;
  onFocusPlayer(playerId: string | undefined): void;
}

/** As 11 vagas do esquema, por linha (ataque no alto, gol embaixo). */
export function Pitch({
  lineup,
  players,
  unavailable,
  selected,
  onSelect,
  onFocusPlayer,
}: PitchProps) {
  const t = useT();
  const slots = FORMATIONS[lineup.formation].slots;
  return (
    <section aria-label={t("lineup.pitch")} className={styles.pitch}>
      {LINES.map((positions) => {
        const line = slots.filter((slot) => positions.includes(slot.position));
        if (line.length === 0) return null;
        return (
          <div key={positions.join()} className={styles.line}>
            {line.map((slot) => {
              const playerId = lineup.starters[slot.id];
              const player = playerId ? players.get(playerId) : undefined;
              const isSelected = selected?.kind === "slot" && selected.slotId === slot.id;
              const factor = player ? adequacy(player.position, slot.position) : 1;
              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-pressed={isSelected}
                  className={`${styles.slot} ${isSelected ? styles.selected : ""} ${
                    player ? "" : styles.empty
                  }`}
                  onClick={() => onSelect({ kind: "slot", slotId: slot.id })}
                  onFocus={() => onFocusPlayer(playerId)}
                >
                  <span className={styles.position}>{label(`position.${slot.position}`)}</span>
                  <span className={styles.name}>
                    {player?.displayName ?? t("lineup.emptySlot")}
                  </span>
                  {player ? (
                    <span className={styles.meta}>
                      {t("lineup.effective", { value: Math.round(player.strength * factor) })}
                    </span>
                  ) : null}
                  {player && factor < 1 ? (
                    <span className={styles.warning}>
                      {t("lineup.outOfPosition", { percent: Math.round(factor * 100) })}
                    </span>
                  ) : null}
                  {playerId ? <Condition entry={unavailable.get(playerId)} hideAvailable /> : null}
                </button>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
