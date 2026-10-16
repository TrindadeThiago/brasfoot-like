"use client";

import { isSeasonOver, standings } from "@brasfoot-like/engine";
import { type SaveFile, seasonYearOf } from "@brasfoot-like/save";
import { GameLayout } from "../../../game/GameLayout";
import { useT } from "../../../i18n";
import { Crest } from "../../../ui/Crest";
import { StandingsTable } from "../../../ui/StandingsTable";
import styles from "./page.module.css";

function SeasonEnd({ save }: { save: SaveFile }) {
  const t = useT();
  const year = seasonYearOf(save);
  const table = standings(save.season, save.bank);
  const championRow = table[0];
  const champion = save.bank.clubs.find((club) => club.id === championRow?.clubId);
  const mine = table.find((row) => row.clubId === save.clubId);
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  if (!isSeasonOver(save.season) || !championRow || !champion) return null;
  return (
    <div className={styles.layout}>
      <h1>{t("seasonEnd.title", { year })}</h1>
      <section aria-label={t("seasonEnd.champion")} className={styles.champion}>
        <Crest crest={champion.crest} label={champion.name} size={96} />
        <div>
          <p className={styles.label}>{t("seasonEnd.champion")}</p>
          <p className={styles.name}>{champion.name}</p>
          <p>{t("seasonEnd.championPoints", { points: championRow.points })}</p>
        </div>
      </section>
      <p className={styles.mine}>
        {championRow.clubId === save.clubId
          ? t("seasonEnd.yourTitle", { club: club?.name ?? "" })
          : t("seasonEnd.yourPosition", { club: club?.name ?? "", position: mine?.position ?? 0 })}
      </p>
      <StandingsTable save={save} caption={t("seasonEnd.table")} />
      <p className={styles.note}>{t("seasonEnd.next")}</p>
    </div>
  );
}

export default function SeasonEndPage() {
  return <GameLayout>{(save) => <SeasonEnd save={save} />}</GameLayout>;
}
