"use client";

import { drawWarnings, type Season } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import styles from "./DrawNotice.module.css";

/**
 * Aviso do sorteio dos grupos (019 FR-014): quando a separação não coube, o sorteio concluiu
 * mesmo assim e diz quais clubes ficaram no mesmo grupo.
 */
export function DrawNotice({
  save,
  season,
  stageIndex,
}: {
  save: SaveFile;
  season: Season;
  stageIndex: number;
}) {
  const t = useT();
  const warnings = drawWarnings(season).filter((warning) => warning.stage === stageIndex);
  if (warnings.length === 0) return null;
  const name = (id: string) => save.bank.clubs.find((club) => club.id === id)?.name ?? id;
  return (
    <aside role="status" aria-label={t("stages.drawNotice.title")} className={styles.notice}>
      <h3>{t("stages.drawNotice.title")}</h3>
      <ul>
        {warnings.map((warning) => (
          <li key={`${warning.rule.attribute}-${warning.clubIds.join("-")}`}>
            {t("stages.drawNotice.separate", {
              stage: warning.stage + 1,
              attribute: warning.rule.attribute,
              clubs: warning.clubIds.map(name).join(", "),
            })}
          </li>
        ))}
      </ul>
    </aside>
  );
}
