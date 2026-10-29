"use client";

import { leagueRound, leagueTotalRounds } from "@brasfoot-like/engine";
import {
  divisionNameOf,
  isCareerSeasonOver,
  isEmployed,
  type SaveFile,
  seasonYearOf,
  userDivisionLevel,
} from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import { SaveIndicator } from "../SaveIndicator";
import styles from "./ScreenHeader.module.css";

/** Título de cada tela do clube (025 FR-007): clube, técnico, série, temporada e rodada. */
export function ScreenHeader({ save }: { save: SaveFile }) {
  const t = useT();
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const year = seasonYearOf(save);
  const total = leagueTotalRounds(save.league);
  const division = divisionNameOf(save, userDivisionLevel(save));
  return (
    <header className={styles.header}>
      {club ? <Crest crest={club.crest} label={club.name} size={44} /> : null}
      <div className={styles.title}>
        <h1 className={styles.name}>
          {isEmployed(save) ? club?.name : t("header.unemployed", { club: club?.name ?? "" })}
        </h1>
        <p className={styles.meta}>
          <span>{t("header.manager", { name: save.managerName })}</span>
          <span>
            {isCareerSeasonOver(save)
              ? t("header.seasonOver", { year, division })
              : t("header.progress", {
                  year,
                  round: Math.min(leagueRound(save.league), total),
                  total,
                  division,
                })}
          </span>
        </p>
      </div>
      <SaveIndicator />
    </header>
  );
}
