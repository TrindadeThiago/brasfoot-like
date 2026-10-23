import { fitnessRules } from "../fitness/rules";
import { deciderFor } from "../knockout/tie";
import { slotValue } from "../match/auto-lineup";
import { applyChange } from "../match/changes";
import { advanceMatch, startMatch } from "../match/engine";
import type { MatchError } from "../match/errors";
import { matchError } from "../match/errors";
import { FORMATIONS, type FormationId } from "../match/formations";
import { maximizeAssignment } from "../match/hungarian";
import { matchResult } from "../match/result";
import type { Lineup, MatchChange, MatchState, Side } from "../match/types";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { applyMatchToStatus } from "./discipline";
import { type SeasonError, seasonError } from "./errors";
import { type PreparedFixture, prepareFixture, squadsByClub } from "./fixture";
import { toMatchRecord } from "./record";
import type { Fixture, MatchRecord, Season, SeasonWarning } from "./types";

/** Uma partida da rodada em andamento. */
export interface LiveMatch {
  fixture: Fixture;
  state: MatchState;
  /** Clube de cada lado. */
  sides: Record<Side, string>;
  prepared: PreparedFixture["sides"];
  /** Divisão da partida; numa rodada da liga, a UI filtra por ele (research.md 007 R2). */
  divisionLevel: number;
}

/** Decisão do jogador aplicada num passo da rodada. */
export interface RoundDecision {
  tick: number;
  clubId: string;
  change: MatchChange;
}

/** Rodada em andamento: só existe em memória (research.md R1). */
export interface LiveRound {
  round: number;
  /** Competição da rodada, quando criada pela liga/carreira (017). */
  competitionId?: string;
  /** Data do dia de jogos da rodada, quando criada pelo dia da carreira (017). */
  date?: string;
  /** Passos do relógio já dados (o da partida mais longa). */
  tick: number;
  matches: LiveMatch[];
  decisions: RoundDecision[];
}

function isOver(state: MatchState): boolean {
  return state.status === "finished" || state.status === "abandoned";
}

/** Passos do relógio já dados por uma partida, a partir do relógio e dos acréscimos. */
export function matchTicks(state: MatchState): number {
  if (state.status === "not_started") return 0;
  const { half, minute, stoppage } = state.clock;
  const regulation = 90 + (state.stoppage.first ?? 0) + (state.stoppage.second ?? 0);
  // Prorrogação (minutos 91–120, sem acréscimos) e pênaltis (um passo por cobrança), 018.
  const kicks = state.shootout?.kicks.length ?? 0;
  if (half >= 3) return regulation + (minute - 90) + kicks;
  if (state.shootout) return regulation + kicks;
  if (half === 1) return minute + stoppage;
  return 45 + (state.stoppage.first ?? 0) + (minute - 45) + stoppage;
}

function withTick(round: LiveRound, matches: LiveMatch[]): LiveRound {
  return {
    ...round,
    matches,
    tick: Math.max(0, ...matches.map((match) => matchTicks(match.state))),
  };
}

/** Prepara as partidas da próxima rodada, com as mesmas regras da temporada. */
export function startRound(
  season: Season,
  world: CompletedBank,
  lineups?: Record<string, Lineup>,
): { ok: true; round: LiveRound } | { ok: false; error: SeasonError } {
  const round = season.calendar[season.nextRound - 1];
  if (!round) throw new Error("temporada encerrada");
  const squads = squadsByClub(world);
  // O desgaste na partida usa as taxas da condição física da competição (017 R5).
  const { drainPer90, penaltyBpPerPoint } = fitnessRules(world, season.competitionId);
  const fatigue = { drainPer90, penaltyBpPerPoint };
  const matches: LiveMatch[] = [];
  for (const fixture of round.fixtures) {
    const decider = fixture.tie ? deciderFor(world, season, fixture) : undefined;
    const prepared = prepareFixture(season, fixture, squads, lineups, decider, fatigue);
    if (!prepared.ok) return prepared;
    const started = startMatch(prepared.value.input);
    if (!started.ok) {
      const failed = started.errors[0];
      const clubId = failed?.side ? fixture[failed.side] : fixture.home;
      if (lineups?.[clubId]) {
        return {
          ok: false,
          error: seasonError("season.invalid_lineup", {
            clubId,
            matchErrorCode: failed?.code ?? "unknown",
          }),
        };
      }
      throw new Error(`escalação automática inválida: ${JSON.stringify(started.errors)}`);
    }
    matches.push({
      fixture,
      state: started.state,
      sides: { home: fixture.home, away: fixture.away },
      prepared: prepared.value.sides,
      divisionLevel: season.divisionLevel,
    });
  }
  return { ok: true, round: { round: round.number, tick: 0, matches, decisions: [] } };
}

/** Avança cada partida ainda em andamento `ticks` passos do relógio do motor. */
export function advanceRound(round: LiveRound, ticks: number): LiveRound {
  if (!Number.isInteger(ticks) || ticks < 1) throw new Error(`passo inválido: ${ticks}`);
  return withTick(
    round,
    round.matches.map((match) =>
      isOver(match.state)
        ? match
        : { ...match, state: advanceMatch(match.state, { minutes: ticks }) },
    ),
  );
}

export function isRoundFinished(round: LiveRound): boolean {
  return round.matches.every((match) => isOver(match.state));
}

/** Leva todas as partidas ao fim. */
export function finishRound(round: LiveRound): LiveRound {
  return withTick(
    round,
    round.matches.map((match) =>
      isOver(match.state) ? match : { ...match, state: advanceMatch(match.state, { toEnd: true }) },
    ),
  );
}

/** Partida do clube na rodada e o lado dele. */
export function matchOf(
  round: LiveRound,
  clubId: string,
): { match: LiveMatch; side: Side } | undefined {
  for (const match of round.matches) {
    if (match.sides.home === clubId) return { match, side: "home" };
    if (match.sides.away === clubId) return { match, side: "away" };
  }
  return undefined;
}

/** Aplica uma decisão do clube no passo atual (substituição, esquema ou postura). */
export function applyRoundChange(
  round: LiveRound,
  clubId: string,
  change: MatchChange,
): { ok: true; round: LiveRound } | { ok: false; error: MatchError } {
  const found = matchOf(round, clubId);
  if (!found)
    return {
      ok: false,
      error: matchError("input.invalid_option", {
        option: "clubId",
        value: clubId,
        min: 0,
        max: 0,
      }),
    };
  const result = applyChange(found.match.state, found.side, change);
  if (!result.ok) return result;
  const matches = round.matches.map((match) =>
    match === found.match ? { ...match, state: result.state } : match,
  );
  return {
    ok: true,
    round: {
      ...round,
      matches,
      decisions: [...round.decisions, { tick: round.tick, clubId, change }],
    },
  };
}

/**
 * Mudança de esquema no meio do jogo: os jogadores em campo nas vagas do novo esquema pela
 * atribuição ótima (mesmo critério da escalação); vagas sem jogador ficam vazias.
 */
export function formationChange(
  round: LiveRound,
  clubId: string,
  formation: FormationId,
  world: CompletedBank,
): MatchChange {
  const found = matchOf(round, clubId);
  if (!found) throw new Error("clube fora da rodada");
  const team = found.match.state.teams[found.side];
  const byId = new Map(world.players.map((player) => [player.id, player]));
  const players = Object.values(team.onField)
    .filter((id): id is string => id !== null)
    .map((id) => byId.get(id))
    .filter((player): player is CompletedPlayer => player !== undefined)
    .sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
  const slots = FORMATIONS[formation].slots;
  const assignment: Record<string, string | null> = {};
  for (const slot of slots) assignment[slot.id] = null;
  if (players.length > 0) {
    const matrix = slots.map((slot) => players.map((player) => slotValue(player, slot.position)));
    maximizeAssignment(matrix).forEach((row, column) => {
      assignment[(slots[row] as (typeof slots)[number]).id] = (
        players[column] as CompletedPlayer
      ).id;
    });
  }
  return { type: "formation", formation, assignment };
}

/** Registros, disciplina, lesões e avisos da rodada terminada aplicados à temporada. */
export function completeRound(
  season: Season,
  _world: CompletedBank,
  round: LiveRound,
): { ok: true; season: Season } | { ok: false; error: SeasonError } {
  if (round.round !== season.nextRound) throw new Error("rodada de outra temporada ou já fechada");
  if (!isRoundFinished(round)) throw new Error("rodada não terminou");
  const next: Season = {
    ...season,
    records: [...season.records],
    status: Object.fromEntries(
      Object.entries(season.status).map(([id, entry]) => [id, { ...entry }]),
    ),
    warnings: [...season.warnings],
  };
  const results: { record: MatchRecord; warnings: SeasonWarning[] }[] = round.matches.map(
    (match) => {
      const playerSides: Record<string, Side> = {};
      for (const player of match.state.input.home.squad) playerSides[player.id] = "home";
      for (const player of match.state.input.away.squad) playerSides[player.id] = "away";
      const record = toMatchRecord(
        match.fixture.round,
        match.fixture.home,
        match.fixture.away,
        matchResult(match.state),
        playerSides,
        { home: match.prepared.home.absences, away: match.prepared.away.absences },
      );
      const warnings = [match.prepared.home.warning, match.prepared.away.warning].filter(
        (warning): warning is SeasonWarning => warning !== undefined,
      );
      return { record, warnings };
    },
  );
  for (const { record, warnings } of results) {
    next.records.push(record);
    next.warnings.push(...warnings);
    applyMatchToStatus(next.status, record, "home", next.rules, next.seed);
    applyMatchToStatus(next.status, record, "away", next.rules, next.seed);
  }
  next.nextRound += 1;
  return { ok: true, season: next };
}
