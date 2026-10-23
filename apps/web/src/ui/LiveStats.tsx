"use client";

import { type LiveMatch, liveStats } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../i18n";
import styles from "./LiveStats.module.css";
import { StatsTable } from "./StatsTable";

/** Estatísticas da partida do jogador, atualizadas a cada minuto (recolhível). */
export function LiveStats({ match, save }: { match: LiveMatch; save: SaveFile }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  return (
    <details open className={styles.panel}>
      <summary>{t("round.liveStats")}</summary>
      <StatsTable
        home={clubs.get(match.sides.home)?.shortName}
        away={clubs.get(match.sides.away)?.shortName}
        stats={liveStats(match.state)}
      />
    </details>
  );
}
