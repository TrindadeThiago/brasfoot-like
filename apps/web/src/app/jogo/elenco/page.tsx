"use client";

import { ageOn, type CompletedPlayer, POSITIONS } from "@brasfoot-like/engine";
import { GameLayout } from "../../../game/GameLayout";
import { label, useT } from "../../../i18n";
import { readPreferences, writePreferences } from "../../../storage/preferences";
import { type Column, DataTable } from "../../../ui/DataTable";

export default function SquadPage() {
  const t = useT();
  return (
    <GameLayout>
      {(save) => {
        const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
        const players = save.bank.players.filter((player) => player.clubId === save.clubId);
        const reference = save.bank.manifest.referenceDate;
        const status = (player: CompletedPlayer) => {
          const entry = save.season.status[player.id];
          if (entry && entry.injury > 0) return t("squad.injured", { matches: entry.injury });
          if (entry && entry.suspension > 0)
            return t("squad.suspended", { matches: entry.suspension });
          return t("squad.available");
        };
        const columns: Column<CompletedPlayer>[] = [
          {
            key: "position",
            header: t("col.playerPosition"),
            render: (player) => label(`position.${player.position}`),
            sortValue: (player) => POSITIONS.indexOf(player.position),
          },
          {
            key: "name",
            header: t("col.player"),
            render: (player) => player.displayName,
            sortValue: (player) => player.displayName,
          },
          {
            key: "age",
            header: t("col.age"),
            render: (player) => ageOn(player.birthDate, reference),
            sortValue: (player) => ageOn(player.birthDate, reference),
            align: "right",
          },
          {
            key: "strength",
            header: t("col.strength"),
            render: (player) => player.strength,
            sortValue: (player) => player.strength,
            align: "right",
          },
          {
            key: "traits",
            header: t("col.traits"),
            render: (player) => player.traits.map((trait) => label(`trait.${trait}`)).join(", "),
          },
          { key: "status", header: t("col.status"), render: status, sortValue: status },
        ];
        return (
          <DataTable
            rows={players}
            columns={columns}
            rowKey={(player) => player.id}
            caption={t("squad.caption", { club: club?.name ?? "" })}
            initialSort={
              readPreferences().squadSort ?? { column: "position", direction: "ascending" }
            }
            onSortChange={(sort) => writePreferences({ squadSort: sort })}
          />
        );
      }}
    </GameLayout>
  );
}
