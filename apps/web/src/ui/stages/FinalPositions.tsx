"use client";

import { finalOrder, type Season } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Crest } from "../Crest";
import styles from "./FinalPositions.module.css";

/**
 * Posição final de cada clube de uma divisão disputada em fases (019 FR-024): o campeão e o vice
 * saem da final, depois quem foi mais longe, depois a classificação geral dos grupos.
 */
export function FinalPositions({ save, season }: { save: SaveFile; season: Season }) {
  const t = useT();
  const clubs = new Map(save.bank.clubs.map((club) => [club.id, club]));
  const order = finalOrder(season, save.bank);
  const label = t("stages.finalPositions", {
    division: divisionNameOf(save, season.divisionLevel, season.competitionId),
  });
  return (
    <section aria-label={label} className={styles.section}>
      <h2>{label}</h2>
      <ol className={styles.list}>
        {order.map((clubId, index) => {
          const club = clubs.get(clubId);
          return (
            <li key={clubId} aria-current={clubId === save.clubId ? "true" : undefined}>
              {club ? <Crest crest={club.crest} label={club.name} size={20} /> : null}
              {t("stages.finalPosition", { position: index + 1, club: club?.name ?? clubId })}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
