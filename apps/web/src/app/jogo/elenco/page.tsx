"use client";

import {
  ageOn,
  type CompletedPlayer,
  POSITIONS,
  type Position,
  slotPosition,
} from "@brasfoot-like/engine";
import type { SaveFile } from "@brasfoot-like/save";
import { useCallback, useMemo, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import { lineupContext } from "../../../game/GameProvider";
import { label, useT } from "../../../i18n";
import {
  readPreferences,
  type SquadAvailability,
  type SquadSector,
  writePreferences,
} from "../../../storage/preferences";
import { Button } from "../../../ui/Button";
import { type Column, DataTable } from "../../../ui/DataTable";
import { conditionText } from "../../../ui/PlayerCondition";
import { PlayerDetails } from "../../../ui/PlayerDetails";
import styles from "./page.module.css";

const SECTORS: readonly SquadSector[] = ["all", "GK", "DEF", "MID", "ATT"];
const AVAILABILITY: readonly SquadAvailability[] = ["all", "available", "unavailable"];
const SECTOR_OF: Record<Position, SquadSector> = {
  GK: "GK",
  FB: "DEF",
  CB: "DEF",
  DM: "MID",
  MF: "MID",
  FW: "ATT",
};
const NO_FILTER = { sector: "all", availability: "all" } as const;

function SquadScreen({ save }: { save: SaveFile }) {
  const t = useT();
  const [filter, setFilter] = useState(() => readPreferences().squadFilter ?? NO_FILTER);
  const [details, setDetails] = useState<string | undefined>();
  const closeDetails = useCallback(() => setDetails(undefined), []);
  const { squad, unavailable } = useMemo(() => lineupContext(save), [save]);
  const blocked = useMemo(
    () => new Map(unavailable.map((entry) => [entry.playerId, entry])),
    [unavailable],
  );
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const reference = save.bank.manifest.referenceDate;

  const updateFilter = (next: typeof filter) => {
    setFilter(next);
    writePreferences({ squadFilter: next });
  };

  const placeOf = (player: CompletedPlayer): string => {
    const slot = Object.entries(save.lineup.starters).find(([, id]) => id === player.id)?.[0];
    if (slot) {
      const position = slotPosition(save.lineup.formation, slot);
      return t("squad.inLineup.starter", {
        position: position ? label(`position.${position}`) : "",
      });
    }
    return save.lineup.bench.includes(player.id)
      ? t("squad.inLineup.bench")
      : t("squad.inLineup.out");
  };
  const status = (player: CompletedPlayer) => conditionText(t, blocked.get(player.id));

  const rows = squad.filter(
    (player) =>
      (filter.sector === "all" || SECTOR_OF[player.position] === filter.sector) &&
      (filter.availability === "all" ||
        (filter.availability === "available") !== blocked.has(player.id)),
  );

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
    { key: "lineup", header: t("col.inLineup"), render: placeOf, sortValue: placeOf },
    {
      key: "actions",
      header: t("col.actions"),
      render: (player) => (
        <Button
          aria-label={t("lineup.detailsOf", { name: player.displayName })}
          onClick={() => setDetails(player.id)}
        >
          {t("lineup.details")}
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.layout}>
      <div className={styles.filters}>
        <label className={styles.field}>
          <span>{t("squad.filterSector")}</span>
          <select
            value={filter.sector}
            onChange={(event) =>
              updateFilter({ ...filter, sector: event.target.value as SquadSector })
            }
          >
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {t(`squad.sector.${sector}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>{t("squad.filterAvailability")}</span>
          <select
            value={filter.availability}
            onChange={(event) =>
              updateFilter({ ...filter, availability: event.target.value as SquadAvailability })
            }
          >
            {AVAILABILITY.map((value) => (
              <option key={value} value={value}>
                {t(`squad.availability.${value}`)}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={() => updateFilter(NO_FILTER)}>{t("squad.clearFilters")}</Button>
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(player) => player.id}
        caption={t("squad.caption", { club: club?.name ?? "" })}
        initialSort={readPreferences().squadSort ?? { column: "position", direction: "ascending" }}
        onSortChange={(sort) => writePreferences({ squadSort: sort })}
      />
      {rows.length === 0 ? <p className={styles.empty}>{t("squad.noMatch")}</p> : null}
      <PlayerDetails save={save} playerId={details} onClose={closeDetails} />
    </div>
  );
}

export default function SquadPage() {
  return <GameLayout>{(save) => <SquadScreen save={save} />}</GameLayout>;
}
