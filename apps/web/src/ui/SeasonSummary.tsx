"use client";

import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import type { SeasonEndSummary } from "../game/selectors";
import { divisionHref } from "../game/useDivision";
import { formatMoney, useT } from "../i18n";
import { Crest } from "./Crest";
import styles from "./SeasonSummary.module.css";
import { screenHref } from "./shell/screens";

/** Resumo do fim de temporada: situação do clube, campeões e quem sobe e desce (US3). */
export function SeasonSummary({ save, summary }: { save: SaveFile; summary: SeasonEndSummary }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const club = clubs.get(save.clubId);
  const { mine } = summary;
  return (
    <>
      <p className={`${styles.mine} ${styles[mine.situation]}`}>
        {t(`seasonEnd.mine.${mine.situation}`, {
          club: club?.name ?? "",
          position: mine.position,
          division: divisionNameOf(
            save,
            mine.situation === "champion" ? mine.level : mine.nextLevel,
          ),
        })}
      </p>
      <p>{t("seasonEnd.prize", { club: club?.name ?? "", amount: formatMoney(mine.prize) })}</p>
      <div className={styles.champions}>
        {summary.champions.map((champion) => {
          const winner = clubs.get(champion.clubId);
          const label = t("seasonEnd.champion", { division: divisionNameOf(save, champion.level) });
          return (
            <section key={champion.level} aria-label={label} className={styles.champion}>
              {winner ? <Crest crest={winner.crest} label={winner.name} size={72} /> : null}
              <div>
                <p className={styles.label}>{label}</p>
                <p className={styles.name}>{winner?.name}</p>
                {champion.staged ? null : (
                  <p>{t("seasonEnd.championPoints", { points: champion.points })}</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
      <div className={styles.moves}>
        {summary.moves.map((move) => {
          const title = t(move.to < move.from ? "seasonEnd.promotedTo" : "seasonEnd.relegatedTo", {
            division: divisionNameOf(save, move.to),
          });
          return (
            <section key={`${move.from}-${move.to}`} aria-label={title} className={styles.move}>
              <h2>{title}</h2>
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
      <nav className={styles.links}>
        {save.league.divisions.map((season) => (
          <Link
            key={season.divisionLevel}
            href={divisionHref("/jogo/competicao", save.id, season.divisionLevel)}
          >
            {t("seasonEnd.finalStandings", {
              division: divisionNameOf(save, season.divisionLevel),
            })}
          </Link>
        ))}
        <Link href={screenHref("/jogo/historico", save.id)}>{t("seasonEnd.history")}</Link>
      </nav>
    </>
  );
}
