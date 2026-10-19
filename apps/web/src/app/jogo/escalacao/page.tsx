"use client";

import {
  FORMATION_IDS,
  type FormationId,
  isLeagueSeasonOver,
  type Place,
  POSTURES,
  type Posture,
  SEASON_BENCH_LIMIT,
  validateLineup,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useCallback, useMemo, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import { lineupContext, type useGame } from "../../../game/GameProvider";
import { occupantOf, selectPlace } from "../../../game/lineup-selection";
import { label, useT } from "../../../i18n";
import { Button } from "../../../ui/Button";
import { LineupIssues } from "../../../ui/LineupIssues";
import { LineupList } from "../../../ui/LineupList";
import { playerName } from "../../../ui/lineup-text";
import { Pitch } from "../../../ui/Pitch";
import { PlayerDetails } from "../../../ui/PlayerDetails";
import { useShortcuts } from "../../../ui/useShortcuts";
import styles from "./page.module.css";

function LineupScreen({ save, game }: { save: SaveFile; game: ReturnType<typeof useGame> }) {
  const t = useT();
  const [source, setSource] = useState<Place | undefined>();
  const [message, setMessage] = useState("");
  const [focused, setFocused] = useState<string | undefined>();
  const [details, setDetails] = useState<string | undefined>();
  const { squad, unavailable } = useMemo(() => lineupContext(save), [save]);
  const players = useMemo(() => new Map(squad.map((player) => [player.id, player])), [squad]);
  const blocked = useMemo(
    () => new Map(unavailable.map((entry) => [entry.playerId, entry])),
    [unavailable],
  );
  const validation = validateLineup(save.lineup, squad, unavailable);

  const select = (place: Place) => {
    const step = selectPlace(save.lineup, source, place);
    if (step.kind === "selected") {
      setSource(step.source);
      const playerId = occupantOf(save.lineup, step.source);
      setMessage(
        playerId
          ? t("lineup.selected", { name: playerName(save, playerId) })
          : t("lineup.selectedEmpty"),
      );
      return;
    }
    setSource(undefined);
    if (step.kind === "cancelled") {
      setMessage(t("lineup.cancelled"));
      return;
    }
    const moving = occupantOf(save.lineup, step.from);
    const displaced = occupantOf(save.lineup, step.to);
    const result = game.placePlayer(step.from, step.to);
    if (!result.ok) {
      setMessage(
        result.code === "bench_full" ? t("lineup.benchFull", { max: SEASON_BENCH_LIMIT }) : "",
      );
      return;
    }
    if (moving && displaced && displaced !== moving) {
      setMessage(
        t("lineup.swappedPair", { a: playerName(save, moving), b: playerName(save, displaced) }),
      );
    } else if (moving) {
      setMessage(t("lineup.swapped", { name: playerName(save, moving) }));
    }
  };

  const closeDetails = useCallback(() => setDetails(undefined), []);
  const shortcuts = useMemo<Record<string, () => void>>(
    () => ({
      a: () => game.autoLineup(),
      i: () => {
        if (focused) setDetails(focused);
      },
      Escape: () => {
        setSource(undefined);
        setMessage(t("lineup.cancelled"));
      },
    }),
    [game, focused, t],
  );
  useShortcuts(shortcuts);

  return (
    <div className={styles.layout}>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span>{t("lineup.formation")}</span>
          <select
            value={save.lineup.formation}
            onChange={(event) => game.changeFormation(event.target.value as FormationId)}
          >
            {FORMATION_IDS.map((formation) => (
              <option key={formation} value={formation}>
                {label(`formation.${formation}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t("lineup.posture")}</span>
          <select
            value={save.lineup.posture}
            onChange={(event) => game.setPosture(event.target.value as Posture)}
          >
            {POSTURES.map((posture) => (
              <option key={posture} value={posture}>
                {label(`posture.${posture}`)}
              </option>
            ))}
          </select>
        </label>
        <Button variant="primary" onClick={() => game.autoLineup()}>
          {t("lineup.auto")}
        </Button>
        <span role="status" className={styles.status}>
          {message}
        </span>
      </div>
      {isLeagueSeasonOver(save.league) ? (
        <p className={styles.note}>{t("lineup.seasonOver")}</p>
      ) : null}
      <LineupIssues issues={validation.issues} save={save} />
      <div className={styles.board}>
        <Pitch
          lineup={save.lineup}
          players={players}
          unavailable={blocked}
          selected={source}
          onSelect={select}
          onFocusPlayer={setFocused}
        />
        <LineupList
          lineup={save.lineup}
          squad={squad}
          players={players}
          unavailable={blocked}
          selected={source}
          onSelect={select}
          onFocusPlayer={setFocused}
        />
      </div>
      <PlayerDetails save={save} playerId={details} onClose={closeDetails} />
    </div>
  );
}

export default function LineupPage() {
  return <GameLayout>{(save, game) => <LineupScreen save={save} game={game} />}</GameLayout>;
}
