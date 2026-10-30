"use client";

import { divisionNameOf, type SaveFile, userDivisionLevel } from "@brasfoot-like/save";
import type { SeasonEndSummary } from "../../game/selectors";
import { useT } from "../../i18n";
import { Badge } from "../Badge";
import { Crest } from "../Crest";
import styles from "./season.module.css";

/** Campeões das ligas nacionais: o campeão e os pontos de cada divisão, com a do clube em destaque (030). */
export function Champions({ save, summary }: { save: SaveFile; summary: SeasonEndSummary }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const own = userDivisionLevel(save);
  return (
    <section aria-label={t("seasonEnd.champions")} className={styles.section}>
      <h2>{t("seasonEnd.champions")}</h2>
      <div className={styles.champions}>
        {summary.champions.map((champion) => {
          const winner = clubs.get(champion.clubId);
          const label = t("seasonEnd.champion", { division: divisionNameOf(save, champion.level) });
          const mine = champion.level === own;
          return (
            <section
              key={champion.level}
              aria-label={label}
              aria-current={mine ? "true" : undefined}
              className={mine ? `${styles.champion} ${styles.mine}` : styles.champion}
            >
              {winner ? <Crest crest={winner.crest} label={winner.name} size={56} /> : null}
              <div>
                <p className={styles.label}>
                  {label}
                  {mine ? <Badge tone="accent">{t("seasonEnd.yourDivision")}</Badge> : null}
                </p>
                <p className={styles.name}>{winner?.name}</p>
                {champion.staged ? null : (
                  <p>{t("seasonEnd.championPoints", { points: champion.points })}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
