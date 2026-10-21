"use client";

import type { ShootoutKick } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import styles from "./ShootoutPanel.module.css";

const ICON = { goal: "✔", saved: "✋", post: "▯", off: "✖" } as const;

/** Disputa de pênaltis: cada cobrança em ordem, com o placar da série separado do jogo. */
export function ShootoutPanel({
  save,
  home,
  away,
  kicks,
  score,
}: {
  save: SaveFile;
  home: string;
  away: string;
  kicks: readonly ShootoutKick[];
  score: Record<"home" | "away", number>;
}) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const players = new Map(save.bank.players.map((player) => [player.id, player.displayName]));
  const sides = { home: clubs.get(home), away: clubs.get(away) };
  return (
    <section aria-label={t("cup.shootout.title")} className={styles.panel}>
      <h3>{t("cup.shootout.title")}</h3>
      <p className={styles.score}>
        {t("cup.shootout.score", {
          home: sides.home?.shortName ?? home,
          away: sides.away?.shortName ?? away,
          homeScore: score.home,
          awayScore: score.away,
        })}
      </p>
      <ol className={styles.list}>
        {kicks.map((kick) => {
          const club = sides[kick.side];
          return (
            <li
              key={kick.order}
              className={`${styles.kick} ${kick.outcome === "goal" ? styles.scored : styles.missed}`}
            >
              {club ? <Crest crest={club.crest} label={club.name} size={18} /> : <span />}
              <span>{players.get(kick.playerId) ?? kick.playerId}</span>
              <span>
                <span aria-hidden="true">{ICON[kick.outcome]} </span>
                {t(`cup.shootout.${kick.outcome}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
