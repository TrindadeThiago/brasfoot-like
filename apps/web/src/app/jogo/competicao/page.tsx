"use client";

import { divisionZones } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { useSearchParams } from "next/navigation";
import { GameLayout } from "../../../game/GameLayout";
import { useDivision } from "../../../game/useDivision";
import { useT } from "../../../i18n";
import { CompetitionSelect } from "../../../ui/CompetitionSelect";
import { CompetitionTabs } from "../../../ui/CompetitionTabs";
import { Bracket } from "../../../ui/cup/Bracket";
import { DivisionTabs } from "../../../ui/DivisionTabs";
import { ParticipantOrigins } from "../../../ui/qualification/ParticipantOrigins";
import { StandingsTable } from "../../../ui/StandingsTable";
import { StageNav } from "../../../ui/stages/StageNav";
import { currentStage, StageView } from "../../../ui/stages/StageView";

function Standings({ save }: { save: SaveFile }) {
  const t = useT();
  const { competitionId, league, level, season } = useDivision(save);
  const asked = useSearchParams()?.get("fase");
  const requested = asked === null || asked === undefined ? Number.NaN : Number(asked);
  if (season.stages) {
    const known = Number.isInteger(requested) && requested >= 0 && requested < season.stages.length;
    const chosen = known ? requested : currentStage(season);
    return (
      <>
        <CompetitionSelect save={save} competitionId={competitionId} />
        <CompetitionTabs careerId={save.id} level={level} competitionId={competitionId} />
        <DivisionTabs save={save} level={level} league={league} />
        <StageNav save={save} season={season} competitionId={competitionId} selected={chosen} />
        <StageView save={save} season={season} stageIndex={chosen} />
        <ParticipantOrigins save={save} league={league} />
      </>
    );
  }
  if (season.bracket) {
    return (
      <>
        <CompetitionSelect save={save} competitionId={competitionId} />
        <CompetitionTabs careerId={save.id} level={level} competitionId={competitionId} cup />
        <Bracket save={save} season={season} />
        <ParticipantOrigins save={save} league={league} />
      </>
    );
  }
  return (
    <>
      <CompetitionSelect save={save} competitionId={competitionId} />
      <CompetitionTabs careerId={save.id} level={level} competitionId={competitionId} />
      <DivisionTabs save={save} level={level} league={league} />
      <div data-tip-anchor="table">
        <StandingsTable
          key={level}
          save={save}
          season={season}
          zones={divisionZones(save.bank, competitionId, level)}
          caption={t("competition.caption", {
            division: divisionNameOf(save, level, competitionId),
          })}
        />
      </div>
      <ParticipantOrigins save={save} league={league} />
    </>
  );
}

export default function CompetitionPage() {
  return <GameLayout>{(save) => <Standings save={save} />}</GameLayout>;
}
