"use client";

import { GameLayout } from "../../../game/GameLayout";
import { useT } from "../../../i18n";
import { CompetitionTabs } from "../../../ui/CompetitionTabs";
import { StandingsTable } from "../../../ui/StandingsTable";

export default function CompetitionPage() {
  const t = useT();
  return (
    <GameLayout>
      {(save) => (
        <>
          <CompetitionTabs careerId={save.id} />
          <StandingsTable save={save} caption={t("competition.caption")} />
        </>
      )}
    </GameLayout>
  );
}
