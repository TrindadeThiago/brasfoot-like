"use client";

import { groupTables, type Season, seasonStages } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { StandingsTable } from "../StandingsTable";
import styles from "./GroupTables.module.css";

/**
 * Uma tabela por grupo de uma fase de grupos (019 US1), com a zona de classificação marcada. O
 * grupo do clube do jogador vem primeiro; os demais seguem a ordem das letras.
 */
export function GroupTables({
  save,
  season,
  stageIndex,
}: {
  save: SaveFile;
  season: Season;
  stageIndex: number;
}) {
  const t = useT();
  const format = seasonStages(save.bank, season)[stageIndex];
  if (format?.type !== "groups") return null;
  const tables = groupTables(season, save.bank, stageIndex);
  const mine = tables.findIndex(({ group }) => group.clubIds.includes(save.clubId));
  const ordered =
    mine > 0 ? [tables[mine], ...tables.filter((_, index) => index !== mine)] : tables;
  const qualified = format.qualified;
  return (
    <section aria-label={t("stages.groups")} className={styles.groups}>
      {ordered.map((entry) =>
        entry ? (
          <div key={entry.group.id} className={styles.group}>
            <StandingsTable
              save={save}
              rows={entry.rows}
              caption={t("stages.group", { group: entry.group.id })}
              {...(qualified !== undefined
                ? { qualification: { qualified, extra: (format.extra ?? 0) > 0 } }
                : {})}
            />
          </div>
        ) : null,
      )}
    </section>
  );
}
