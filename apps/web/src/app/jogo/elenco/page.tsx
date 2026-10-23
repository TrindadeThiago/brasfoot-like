"use client";

import {
  ageOn,
  type CompletedPlayer,
  POSITIONS,
  type Position,
  slotPosition,
} from "@brasfoot-like/engine";
import { currentDate, type SaveFile } from "@brasfoot-like/save";
import { useCallback, useMemo, useState } from "react";
import { GameLayout } from "../../../game/GameLayout";
import { lineupContext, type useGame } from "../../../game/GameProvider";
import { fitnessAt } from "../../../game/selectors";
import { label, useT } from "../../../i18n";
import {
  readPreferences,
  type SquadAvailability,
  type SquadSector,
  writePreferences,
} from "../../../storage/preferences";
import { Button } from "../../../ui/Button";
import { type Column, DataTable } from "../../../ui/DataTable";
import { type Disposal, DisposalDialog } from "../../../ui/DisposalDialog";
import { evolutionText, lastEvolution } from "../../../ui/evolution-text";
import { FitnessMeter } from "../../../ui/FitnessMeter";
import { conditionText, HangingBadge } from "../../../ui/PlayerCondition";
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
type Game = ReturnType<typeof useGame>;
const NO_FILTER = { sector: "all", availability: "all" } as const;

function SquadScreen({ save, game }: { save: SaveFile; game: Game }) {
  const t = useT();
  const [filter, setFilter] = useState(() => readPreferences().squadFilter ?? NO_FILTER);
  const [details, setDetails] = useState<string | undefined>();
  const [disposal, setDisposal] = useState<Disposal | undefined>();
  const [notice, setNotice] = useState<string | undefined>();
  const locked = game.state.live !== undefined;
  const closeDetails = useCallback(() => setDetails(undefined), []);
  const { squad, unavailable, competitionId, elsewhere, hanging } = useMemo(
    () => lineupContext(save),
    [save],
  );
  const blocked = useMemo(
    () => new Map(unavailable.map((entry) => [entry.playerId, entry])),
    [unavailable],
  );
  const club = save.bank.clubs.find((entry) => entry.id === save.clubId);
  const reference = currentDate(save);
  const fitness = useMemo(() => fitnessAt(save), [save]);

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
  const competitionName = (id: string) =>
    save.bank.competitions.find((entry) => entry.id === id)?.name ?? "";
  const several = save.bank.competitions.length > 1;
  const suspendedElsewhere = new Map(elsewhere.map((entry) => [entry.playerId, entry]));
  // Suspensão com o nome da competição em que é cumprida (017 FR-026).
  const status = (player: CompletedPlayer) => {
    const entry = blocked.get(player.id);
    if (several && entry?.reason === "suspension") {
      return t("squad.suspendedIn", {
        matches: entry.remaining,
        competition: competitionName(competitionId),
      });
    }
    const other = suspendedElsewhere.get(player.id);
    if (!entry && other) {
      return t("squad.suspendedIn", {
        matches: other.remaining,
        competition: competitionName(other.competitionId),
      });
    }
    return conditionText(t, entry);
  };

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
    {
      key: "status",
      header: t("col.status"),
      render: (player) => (
        <>
          {status(player)}
          {hanging.has(player.id) ? " " : null}
          <HangingBadge hanging={hanging.has(player.id)} />
        </>
      ),
      sortValue: status,
    },
    { key: "lineup", header: t("col.inLineup"), render: placeOf, sortValue: placeOf },
    {
      key: "fitness",
      header: t("col.fitness"),
      render: (player) => <FitnessMeter value={fitness(player.id)} />,
      sortValue: (player) => fitness(player.id),
      align: "right",
    },
    {
      key: "evolution",
      header: t("col.evolution"),
      render: (player) => evolutionText(lastEvolution(save, player.id)),
      sortValue: (player) => lastEvolution(save, player.id),
      align: "right",
    },
    {
      key: "contract",
      header: t("col.contractUntil"),
      render: (player) => {
        const contract = player.contract;
        if (!contract) return "—";
        const marks = [
          contract.untilYear <= save.league.year ? t("squad.lastYear") : undefined,
          contract.loan ? t("squad.onLoan") : undefined,
        ].filter(Boolean);
        return marks.length > 0
          ? `${contract.untilYear} · ${marks.join(" · ")}`
          : contract.untilYear;
      },
      sortValue: (player) => player.contract?.untilYear ?? 0,
      align: "right",
    },
    {
      key: "actions",
      header: t("col.actions"),
      render: (player) => (
        <span className={styles.rowActions}>
          <Button
            aria-label={t("lineup.detailsOf", { name: player.displayName })}
            onClick={() => setDetails(player.id)}
          >
            {t("lineup.details")}
          </Button>
          <Button
            aria-label={t("squad.sellOf", { name: player.displayName })}
            disabled={locked}
            onClick={() => setDisposal({ kind: "sell", playerId: player.id })}
          >
            {t("squad.sell")}
          </Button>
          <Button
            aria-label={t("squad.terminateOf", { name: player.displayName })}
            disabled={locked}
            onClick={() => setDisposal({ kind: "terminate", playerId: player.id })}
          >
            {t("squad.terminate")}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className={styles.layout}>
      {notice ? <p role="status">{notice}</p> : null}
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
      <DisposalDialog
        save={save}
        game={game}
        target={disposal}
        onClose={() => setDisposal(undefined)}
        onDone={setNotice}
      />
    </div>
  );
}

export default function SquadPage() {
  return <GameLayout>{(save, game) => <SquadScreen save={save} game={game} />}</GameLayout>;
}
