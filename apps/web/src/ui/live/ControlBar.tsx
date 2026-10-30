"use client";

import type { Ref } from "react";
import { SPEEDS } from "../../game/useLiveRound";
import { useT } from "../../i18n";
import type { RoundSpeed } from "../../storage/preferences";
import { Badge } from "../Badge";
import { Button } from "../Button";
import styles from "./ControlBar.module.css";

/**
 * Barra de controle da rodada ao vivo (030): sair, velocidade, pausar e retomar, terminar agora e a
 * pausa automática, com o estado (rodando ou pausada) e a velocidade escritos.
 */
export function ControlBar({
  speed,
  paused,
  finished,
  autoPause,
  toggleRef,
  onSpeed,
  onToggle,
  onFinishNow,
  onAutoPause,
  onLeave,
}: {
  speed: RoundSpeed;
  paused: boolean;
  finished: boolean;
  autoPause: boolean;
  toggleRef: Ref<HTMLButtonElement>;
  onSpeed: (speed: RoundSpeed) => void;
  onToggle: () => void;
  onFinishNow: () => void;
  onAutoPause: (value: boolean) => void;
  onLeave: () => void;
}) {
  const t = useT();
  return (
    <fieldset
      className={styles.bar}
      aria-label={t("round.controls")}
      data-tip-anchor="round-controls"
    >
      <Button onClick={onLeave}>{t("round.leave")}</Button>
      <label className={styles.field}>
        <span>{t("round.speed")}</span>
        <select value={speed} onChange={(event) => onSpeed(event.target.value as RoundSpeed)}>
          {SPEEDS.map((value) => (
            <option key={value} value={value}>
              {t(`round.speed.${value}`)}
            </option>
          ))}
        </select>
      </label>
      <Button ref={toggleRef} variant="primary" onClick={onToggle} disabled={finished}>
        {paused ? t("round.resume") : t("round.pause")}
      </Button>
      <Button onClick={onFinishNow} disabled={finished}>
        {t("round.finishNow")}
      </Button>
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={autoPause}
          onChange={(event) => onAutoPause(event.target.checked)}
        />
        <span>{t("round.autoPause")}</span>
      </label>
      <Badge tone={paused ? "warning" : "accent"}>
        <span aria-hidden="true">{paused ? "⏸ " : "▶ "}</span>
        {paused ? t("round.state.paused") : t("round.state.running")}
      </Badge>
    </fieldset>
  );
}
