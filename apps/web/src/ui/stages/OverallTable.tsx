"use client";

import {
  divisionZones,
  finalOrder,
  type OverallRow,
  overallStandings,
  type Season,
  stageQualifiers,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useT } from "../../i18n";
import { StandingsTable } from "../StandingsTable";

/**
 * Classificação geral da fase de grupos (019 FR-018): todos os grupos juntos, com a marcação de
 * quem se classificaria e de quem cairia se a fase acabasse agora.
 */
export function OverallTable({
  save,
  season,
  stageIndex,
}: {
  save: SaveFile;
  season: Season;
  stageIndex: number;
}) {
  const t = useT();
  const rows = overallStandings(season, save.bank, stageIndex);
  const qualifiers = new Map(
    stageQualifiers(season, save.bank, stageIndex).map((entry) => [entry.clubId, entry]),
  );
  const { relegation } = divisionZones(save.bank, season.competitionId, season.divisionLevel);
  const order = finalOrder(season, save.bank);
  const relegated = new Set(relegation > 0 ? order.slice(order.length - relegation) : []);
  const group = new Map(rows.map((row) => [row.clubId, row.group]));
  return (
    <section aria-label={t("stages.overall.title")}>
      <StandingsTable
        save={save}
        rows={rows}
        caption={t("stages.overall.caption")}
        zoneOf={(row) => {
          if (relegated.has(row.clubId)) return "relegationToday";
          const qualifier = qualifiers.get(row.clubId);
          if (!qualifier) return undefined;
          return qualifier.extra ? "extraToday" : "qualifiedToday";
        }}
        legend={t("stages.overall.legend", { qualified: qualifiers.size, relegation })}
        extraColumns={[
          {
            key: "group",
            header: t("stages.overall.group"),
            render: (row) => group.get(row.clubId) ?? (row as OverallRow).group,
            sortValue: (row) => group.get(row.clubId) ?? "",
          },
        ]}
      />
    </section>
  );
}
