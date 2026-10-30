"use client";

import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import type { SeasonEndSummary } from "../../game/selectors";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import styles from "./season.module.css";

/** Acesso e rebaixamento: os clubes que sobem e descem em cada fronteira, com o do jogador em destaque (030). */
export function Moves({ save, summary }: { save: SaveFile; summary: SeasonEndSummary }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  if (summary.moves.length === 0) return null;
  return (
    <section aria-label={t("seasonEnd.moves")} className={styles.section}>
      <h2>{t("seasonEnd.moves")}</h2>
      <div className={styles.moves}>
        {summary.moves.map((move) => {
          const title = t(move.to < move.from ? "seasonEnd.promotedTo" : "seasonEnd.relegatedTo", {
            division: divisionNameOf(save, move.to),
          });
          return (
            <section key={`${move.from}-${move.to}`} aria-label={title} className={styles.move}>
              <h3>{title}</h3>
              <ul>
                {move.clubs.map((entry) => {
                  const moved = clubs.get(entry.clubId);
                  return (
                    <li
                      key={entry.clubId}
                      aria-current={entry.clubId === save.clubId ? "true" : undefined}
                    >
                      {moved ? <Crest crest={moved.crest} label={moved.name} size={20} /> : null}
                      {t("seasonEnd.moverLine", {
                        position: entry.position,
                        club: moved?.name ?? entry.clubId,
                      })}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
