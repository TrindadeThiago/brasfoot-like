"use client";

import { divisionNameOf, type SaveFile, userSeason } from "@brasfoot-like/save";
import { useState } from "react";
import { useT } from "../../i18n";
import { StandingsTable } from "../StandingsTable";

/** Classificação final da divisão do clube, recolhida; a tabela só é montada quando se abre (030). */
export function FinalTable({ save }: { save: SaveFile }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const season = userSeason(save);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{t("seasonEnd.finalTable")}</summary>
      {open ? (
        <StandingsTable
          save={save}
          caption={t("seasonEnd.finalStandings", {
            division: divisionNameOf(save, season.divisionLevel),
          })}
        />
      ) : null}
    </details>
  );
}
