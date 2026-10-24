"use client";

import { cupView, type Season, seasonStages, stageOrigin } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { Bracket } from "../cup/Bracket";

/**
 * Chaveamento da fase eliminatória de uma divisão em fases, com a origem de cada vaga na 1ª fase
 * ("1º do Grupo B"): o `Bracket` da copa sobre uma visão da fase (019 R3).
 */
export function StageBracket({
  save,
  season,
  stageIndex,
}: {
  save: SaveFile;
  season: Season;
  stageIndex: number;
}) {
  const t = useT();
  const view = cupView(season, save.bank, stageIndex);
  const formats = seasonStages(save.bank, season);
  // A fase de pontos de que os classificados vieram: a mais próxima antes desta.
  let source = -1;
  for (let index = stageIndex - 1; index >= 0; index--) {
    if (formats[index]?.type !== "knockout") {
      source = index;
      break;
    }
  }
  const originOf = (clubId: string): string | undefined => {
    if (source < 0 || !season.stages?.[source]?.started) return undefined;
    const origin = stageOrigin(season, save.bank, source, clubId);
    if (!origin) return undefined;
    if ("group" in origin) {
      return t("stages.origin.group", { position: origin.position, group: origin.group });
    }
    if ("table" in origin) return t("stages.origin.table", { position: origin.table });
    return t("stages.origin.extra", { extra: origin.extra });
  };
  return <Bracket save={save} season={view} originOf={originOf} />;
}
