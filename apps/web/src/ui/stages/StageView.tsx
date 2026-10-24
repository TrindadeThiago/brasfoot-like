"use client";

import { leagueStageStandings, type Season, seasonStages } from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { StandingsTable } from "../StandingsTable";
import { DrawNotice } from "./DrawNotice";
import { GroupTables } from "./GroupTables";
import { OverallTable } from "./OverallTable";
import { StageBracket } from "./StageBracket";

/** A fase de uma divisão em fases que está em andamento (a última que já começou). */
export function currentStage(season: Season): number {
  const started = (season.stages ?? []).filter((stage) => stage.started);
  return started.at(-1)?.index ?? 0;
}

/** Tela de uma fase: tabelas dos grupos, tabela de pontos corridos ou chaveamento. */
export function StageView({
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
  if (!format || !season.stages?.[stageIndex]?.started) {
    return <p>{t("cup.toBeDefined")}</p>;
  }
  if (format.type === "groups") {
    return (
      <>
        <DrawNotice save={save} season={season} stageIndex={stageIndex} />
        <GroupTables save={save} season={season} stageIndex={stageIndex} />
        <OverallTable save={save} season={season} stageIndex={stageIndex} />
      </>
    );
  }
  if (format.type === "knockout") {
    return <StageBracket save={save} season={season} stageIndex={stageIndex} />;
  }
  return (
    <StandingsTable
      save={save}
      rows={leagueStageStandings(season, save.bank, stageIndex)}
      caption={t("stages.league")}
      {...(format.qualified !== undefined
        ? { qualification: { qualified: format.qualified, extra: false } }
        : {})}
    />
  );
}
