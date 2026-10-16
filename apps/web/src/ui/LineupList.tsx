"use client";

import {
  type CompletedPlayer,
  type Lineup,
  type Place,
  POSITIONS,
  SEASON_BENCH_LIMIT,
  type Unavailability,
} from "@brasfoot-like/engine";
import { samePlace as same } from "../game/lineup-selection";
import { label, useT } from "../i18n";
import styles from "./LineupList.module.css";
import { Condition } from "./PlayerCondition";

interface LineupListProps {
  lineup: Lineup;
  squad: readonly CompletedPlayer[];
  players: ReadonlyMap<string, CompletedPlayer>;
  unavailable: ReadonlyMap<string, Unavailability>;
  selected?: Place | undefined;
  onSelect(place: Place): void;
  onFocusPlayer(playerId: string | undefined): void;
}

const samePlace = (a: Place | undefined, b: Place) => (a ? same(a, b) : false);

/** Banco (em ordem, com a vaga livre) e jogadores fora da relação. */
export function LineupList({
  lineup,
  squad,
  players,
  unavailable,
  selected,
  onSelect,
  onFocusPlayer,
}: LineupListProps) {
  const t = useT();
  const used = new Set([...Object.values(lineup.starters), ...lineup.bench]);
  const outside = squad
    .filter((player) => !used.has(player.id))
    .sort(
      (a, b) =>
        POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position) ||
        b.strength - a.strength ||
        a.id.localeCompare(b.id),
    );

  const row = (place: Place, player: CompletedPlayer) => {
    const isSelected = samePlace(selected, place);
    return (
      <li key={player.id}>
        <button
          type="button"
          aria-pressed={isSelected}
          className={`${styles.row} ${isSelected ? styles.selected : ""}`}
          onClick={() => onSelect(place)}
          onFocus={() => onFocusPlayer(player.id)}
        >
          <span className={styles.position}>{label(`position.${player.position}`)}</span>
          <span className={styles.name}>{player.displayName}</span>
          <span className={styles.strength}>{player.strength}</span>
          <Condition entry={unavailable.get(player.id)} hideAvailable />
        </button>
      </li>
    );
  };

  const benchTitle = t("lineup.bench", { count: lineup.bench.length, max: SEASON_BENCH_LIMIT });
  const free: Place = { kind: "bench", index: lineup.bench.length };
  return (
    <div className={styles.columns}>
      <section aria-label={benchTitle} className={styles.group}>
        <h2>{benchTitle}</h2>
        <ul>
          {lineup.bench.map((playerId, index) => {
            const player = players.get(playerId);
            return player ? row({ kind: "bench", index }, player) : null;
          })}
          {lineup.bench.length < SEASON_BENCH_LIMIT ? (
            <li>
              <button
                type="button"
                aria-pressed={samePlace(selected, free)}
                className={`${styles.row} ${styles.free} ${
                  samePlace(selected, free) ? styles.selected : ""
                }`}
                onClick={() => onSelect(free)}
                onFocus={() => onFocusPlayer(undefined)}
              >
                {t("lineup.benchFree")}
              </button>
            </li>
          ) : null}
        </ul>
      </section>
      <section aria-label={t("lineup.outside")} className={styles.group}>
        <h2>{t("lineup.outside")}</h2>
        <ul>{outside.map((player) => row({ kind: "out", playerId: player.id }, player))}</ul>
      </section>
    </div>
  );
}
