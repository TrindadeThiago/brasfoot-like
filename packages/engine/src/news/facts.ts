import { expectationOf } from "../board/goals";
import { clubDivision } from "../career/league";
import { rivalryOf } from "../fans/rivalries";
import { playerLines } from "../season/record";
import type { MatchRecord, Season } from "../season/types";
import { newsRules } from "./rules";
import type { HeadlineType, HeadlineVars, NewsContext } from "./types";

/** Fato ainda sem id, variação e relevância final (montados em `round.ts`). */
export interface Fact {
  type: HeadlineType;
  clubIds: string[];
  playerIds: string[];
  vars: HeadlineVars;
  match?: string;
}

export function matchKey(record: Pick<MatchRecord, "home" | "away">): string {
  return `${record.home}-${record.away}`;
}

type Outcome = "win" | "draw" | "loss";

function outcomeFor(record: MatchRecord, clubId: string): Outcome {
  const own = record.home === clubId ? record.score.home : record.score.away;
  const other = record.home === clubId ? record.score.away : record.score.home;
  return own > other ? "win" : own < other ? "loss" : "draw";
}

/** Jogos do clube na temporada até a rodada, em ordem. */
function clubRecords(season: Season, clubId: string, round: number): MatchRecord[] {
  return season.records
    .filter((record) => record.round <= round && (record.home === clubId || record.away === clubId))
    .sort((a, b) => a.round - b.round);
}

/**
 * Sequência atual do clube na temporada até a rodada (sem atravessar temporadas): vitórias,
 * derrotas ou jogos sem vencer (empates e derrotas misturados).
 */
export function streakOf(
  season: Season,
  clubId: string,
  round: number,
): { kind: "win" | "loss" | "winless"; length: number } {
  const outcomes = clubRecords(season, clubId, round).map((record) => outcomeFor(record, clubId));
  const last = outcomes.at(-1);
  if (!last) return { kind: "winless", length: 0 };
  let length = 0;
  if (last === "win" || last === "loss") {
    for (let index = outcomes.length - 1; index >= 0 && outcomes[index] === last; index--) length++;
    return { kind: last, length };
  }
  for (let index = outcomes.length - 1; index >= 0 && outcomes[index] !== "win"; index--) length++;
  return { kind: "winless", length };
}

/** Jogos sem vencer antes da rodada (para o fim de jejum). */
function winlessBefore(season: Season, clubId: string, round: number): number {
  const outcomes = clubRecords(season, clubId, round - 1).map((record) =>
    outcomeFor(record, clubId),
  );
  let length = 0;
  for (let index = outcomes.length - 1; index >= 0 && outcomes[index] !== "win"; index--) length++;
  return length;
}

/** O vencedor esteve atrás no placar em algum momento (gols em ordem de evento). */
export function isComeback(record: MatchRecord): boolean {
  const winner =
    record.score.home > record.score.away
      ? "home"
      : record.score.away > record.score.home
        ? "away"
        : undefined;
  if (!winner) return false;
  let home = 0;
  let away = 0;
  for (const event of [...record.events].sort((a, b) => a.seq - b.seq)) {
    if (event.type !== "shot" || event.outcome !== "goal") continue;
    if (event.side === "home") home++;
    else away++;
    if (winner === "home" ? home < away : away < home) return true;
  }
  return false;
}

/**
 * Fatos de um jogo fechado (research.md R3): resultado (só para o clube do jogador), hat-trick,
 * goleada, virada, zebra, clássico, sequências e fim de jejum.
 */
export function matchFacts(
  context: NewsContext,
  record: MatchRecord,
  expectations?: ReadonlyMap<string, number>,
): Fact[] {
  const rules = newsRules(context.world, context.league.competitionId);
  const season = clubDivision(context.league, record.home);
  if (!season) return [];
  const match = matchKey(record);
  const facts: Fact[] = [];
  const base = { goalsHome: record.score.home, goalsAway: record.score.away };
  const sides = [record.home, record.away];
  const winnerId =
    record.score.home > record.score.away
      ? record.home
      : record.score.away > record.score.home
        ? record.away
        : undefined;
  const loserId =
    winnerId === undefined ? undefined : winnerId === record.home ? record.away : record.home;
  const pair = { club: record.home, opponent: record.away, ...base };

  for (const clubId of sides) {
    const streak = streakOf(season, clubId, record.round);
    const opponent = clubId === record.home ? record.away : record.home;
    const goalsFor = clubId === record.home ? record.score.home : record.score.away;
    const goalsAgainst = clubId === record.home ? record.score.away : record.score.home;
    const outcome = outcomeFor(record, clubId);
    const own = { club: clubId, opponent, goalsFor, goalsAgainst, outcome };
    if (clubId === context.managerClubId) {
      facts.push({
        type: "result",
        clubIds: [clubId, opponent],
        playerIds: [],
        vars: {
          ...own,
          home: clubId === record.home ? 1 : 0,
          streak: streak.length >= rules.streakMin ? streak.length : 0,
          streakKind: streak.kind,
        },
        match,
      });
    }
    if (streak.length >= rules.streakMin) {
      facts.push({
        type: "streak",
        clubIds: [clubId, opponent],
        playerIds: [],
        vars: { ...own, streak: streak.length, streakKind: streak.kind },
        match,
      });
    }
    if (outcome === "win") {
      const drought = winlessBefore(season, clubId, record.round);
      if (drought >= rules.droughtMin) {
        facts.push({
          type: "droughtEnd",
          clubIds: [clubId, opponent],
          playerIds: [],
          vars: { ...own, drought },
          match,
        });
      }
    }
  }

  for (const [playerId, line] of Object.entries(playerLines(record)).sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    if (line.goals < 3) continue;
    const clubId = line.side === "home" ? record.home : record.away;
    const player = context.world.players.find((entry) => entry.id === playerId);
    facts.push({
      type: "hatTrick",
      clubIds: [clubId, clubId === record.home ? record.away : record.home],
      playerIds: [playerId],
      vars: {
        ...pair,
        player: player?.displayName ?? playerId,
        goals: line.goals,
        scorerClub: clubId,
      },
      match,
    });
  }

  if (winnerId && loserId) {
    const margin = Math.abs(record.score.home - record.score.away);
    const result = { ...pair, winner: winnerId, loser: loserId, margin };
    if (margin >= rules.routMargin) {
      facts.push({
        type: "rout",
        clubIds: [winnerId, loserId],
        playerIds: [],
        vars: result,
        match,
      });
    }
    if (isComeback(record)) {
      facts.push({
        type: "comeback",
        clubIds: [winnerId, loserId],
        playerIds: [],
        vars: result,
        match,
      });
    }
    const expectation = (clubId: string) =>
      expectations?.get(clubId) ?? expectationOf(context, clubId);
    const gap = expectation(winnerId) - expectation(loserId);
    if (gap >= rules.upsetGap) {
      facts.push({
        type: "upset",
        clubIds: [winnerId, loserId],
        playerIds: [],
        vars: { ...result, gap },
        match,
      });
    }
  }

  const rivalry = rivalryOf(context.world, record.home, record.away);
  if (rivalry) {
    facts.push({
      type: "derby",
      clubIds: [...sides],
      playerIds: [],
      vars: {
        ...pair,
        intensity: rivalry.intensity,
        outcome: winnerId === undefined ? "draw" : winnerId === record.home ? "home" : "away",
      },
      match,
    });
  }
  return facts;
}
