"use client";

import { type Season, seasonStages } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import Link from "next/link";
import { divisionHref } from "../../game/useDivision";
import { useT } from "../../i18n";
import styles from "./StageNav.module.css";

/** Navegação entre as fases de uma divisão em fases: cada fase tem a sua tela (019 FR-029). */
export function StageNav({
  save,
  season,
  competitionId,
  selected,
}: {
  save: SaveFile;
  season: Season;
  competitionId: string;
  selected: number;
}) {
  const t = useT();
  const formats = seasonStages(save.bank, season);
  return (
    <nav aria-label={t("stages.nav.label")} className={styles.nav}>
      {(season.stages ?? []).map((stage) => (
        <Link
          key={stage.index}
          href={`${divisionHref("/jogo/competicao", save.id, season.divisionLevel, competitionId)}&fase=${stage.index}`}
          aria-current={stage.index === selected ? "page" : undefined}
          className={stage.index === selected ? styles.active : undefined}
        >
          {t("stages.nav.item", {
            number: stage.index + 1,
            kind: formats[stage.index]?.type ?? "",
          })}
        </Link>
      ))}
    </nav>
  );
}
