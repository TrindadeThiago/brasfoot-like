"use client";

import { squadLimit } from "@brasfoot-like/engine";
import { managedClubId, type SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import styles from "./SquadCounter.module.css";

/** Jogadores do clube do jogador e o máximo do elenco (ex.: 30/40). */
export function SquadCounter({ save }: { save: SaveFile }) {
  const t = useT();
  const count = save.bank.players.filter((player) => player.clubId === save.clubId).length;
  const max = squadLimit(save.clubId, managedClubId(save));
  return (
    <p
      className={`${styles.counter} ${count >= max ? styles.full : ""}`}
      title={t("squad.count.hint", { max })}
    >
      {t("squad.count", { count, max })}
    </p>
  );
}
