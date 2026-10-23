import { unavailabilityOf } from "../lineup/unavailability";
import type { Decider, Lineup, MatchFatigue, MatchInput, Side } from "../match/types";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { type SeasonError, seasonError } from "./errors";
import { lineupForMatch } from "./lineups";
import type { Absence, Fixture, PlayerStatus, Season, SeasonWarning } from "./types";

export function squadsByClub(world: CompletedBank): Map<string, CompletedPlayer[]> {
  const squads = new Map<string, CompletedPlayer[]>();
  for (const player of world.players) {
    const squad = squads.get(player.clubId);
    if (squad) squad.push(player);
    else squads.set(player.clubId, [player]);
  }
  return squads;
}

export interface SideLineup {
  lineup: Lineup;
  absences: Absence[];
  unavailable: string[];
  warning?: SeasonWarning;
}

function sideLineup(
  season: Season,
  round: number,
  clubId: string,
  squad: CompletedPlayer[],
  status: Record<string, PlayerStatus>,
  external: Lineup | undefined,
): { ok: true; value: SideLineup } | { ok: false; error: SeasonError } {
  const blocked = unavailabilityOf(squad, status);

  if (external) {
    const chosen = new Set([...Object.values(external.starters), ...external.bench]);
    const conflict = blocked.find((entry) => chosen.has(entry.playerId));
    if (conflict) {
      return {
        ok: false,
        error: seasonError("season.lineup_unavailable", { clubId, playerId: conflict.playerId }),
      };
    }
    return {
      ok: true,
      value: {
        lineup: external,
        absences: blocked.map(({ playerId, reason }) => ({ playerId, reason, fielded: false })),
        unavailable: blocked.map((entry) => entry.playerId),
      },
    };
  }

  const formation = season.formations[clubId] ?? "4-4-2";
  const { lineup, fielded } = lineupForMatch(squad, formation, blocked);
  const fieldedSet = new Set(fielded);
  const value: SideLineup = {
    lineup,
    absences: blocked.map(({ playerId, reason }) => ({
      playerId,
      reason,
      fielded: fieldedSet.has(playerId),
    })),
    unavailable: blocked
      .filter((entry) => !fieldedSet.has(entry.playerId))
      .map((entry) => entry.playerId),
  };
  if (fielded.length > 0)
    value.warning = { round, clubId, code: "short_squad", playerIds: fielded };
  return { ok: true, value };
}

export interface PreparedFixture {
  input: MatchInput;
  sides: Record<Side, SideLineup>;
}

/** Entrada da partida de um confronto: escalações (externas ou automáticas) e ausências. */
export function prepareFixture(
  season: Season,
  fixture: Fixture,
  squads: Map<string, CompletedPlayer[]>,
  lineups: Record<string, Lineup> | undefined,
  decider?: Decider,
  fatigue?: MatchFatigue,
): { ok: true; value: PreparedFixture } | { ok: false; error: SeasonError } {
  const clubs: Record<Side, string> = { home: fixture.home, away: fixture.away };
  const prepared: Partial<Record<Side, SideLineup>> = {};
  for (const side of ["home", "away"] as const) {
    const clubId = clubs[side];
    const result = sideLineup(
      season,
      fixture.round,
      clubId,
      squads.get(clubId) ?? [],
      season.status,
      lineups?.[clubId],
    );
    if (!result.ok) return result;
    prepared[side] = result.value;
  }
  const home = prepared.home as SideLineup;
  const away = prepared.away as SideLineup;
  return {
    ok: true,
    value: {
      input: {
        home: {
          clubId: fixture.home,
          squad: squads.get(fixture.home) ?? [],
          lineup: home.lineup,
          unavailable: home.unavailable,
        },
        away: {
          clubId: fixture.away,
          squad: squads.get(fixture.away) ?? [],
          lineup: away.lineup,
          unavailable: away.unavailable,
        },
        seed: fixture.seed,
        ...(fixture.neutral ? { neutral: true } : {}),
        ...(decider ? { decider } : {}),
        ...(fatigue ? { fatigue } : {}),
      },
      sides: { home, away },
    },
  };
}
