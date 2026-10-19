"use client";

import { divisionZones } from "@brasfoot-like/engine";
import { divisionNameOf, type SaveFile } from "@brasfoot-like/save";
import { GameLayout } from "../../../game/GameLayout";
import { useDivision } from "../../../game/useDivision";
import { useT } from "../../../i18n";
import { CompetitionTabs } from "../../../ui/CompetitionTabs";
import { DivisionTabs } from "../../../ui/DivisionTabs";
import { StandingsTable } from "../../../ui/StandingsTable";

function Standings({ save }: { save: SaveFile }) {
  const t = useT();
  const { level, season } = useDivision(save);
  return (
    <>
      <CompetitionTabs careerId={save.id} level={level} />
      <DivisionTabs save={save} level={level} />
      <StandingsTable
        key={level}
        save={save}
        season={season}
        zones={divisionZones(save.bank, save.league.competitionId, level)}
        caption={t("competition.caption", { division: divisionNameOf(save, level) })}
      />
    </>
  );
}

export default function CompetitionPage() {
  return <GameLayout>{(save) => <Standings save={save} />}</GameLayout>;
}
