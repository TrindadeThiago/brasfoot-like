"use client";

import { divisionZones } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { GameLayout } from "../../../game/GameLayout";
import { useDivision } from "../../../game/useDivision";
import { useT } from "../../../i18n";
import { CompetitionSelect } from "../../../ui/CompetitionSelect";
import { CompetitionTabs } from "../../../ui/CompetitionTabs";
import { Bracket } from "../../../ui/cup/Bracket";
import { DivisionTabs } from "../../../ui/DivisionTabs";
import { StandingsTable } from "../../../ui/StandingsTable";

function Standings({ save }: { save: SaveFile }) {
  const t = useT();
  const { competitionId, league, level, season } = useDivision(save);
  if (season.bracket) {
    return (
      <>
        <CompetitionSelect save={save} competitionId={competitionId} />
        <CompetitionTabs careerId={save.id} level={level} competitionId={competitionId} cup />
        <Bracket save={save} season={season} />
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
    </>
  );
}

export default function CompetitionPage() {
  return <GameLayout>{(save) => <Standings save={save} />}</GameLayout>;
}
