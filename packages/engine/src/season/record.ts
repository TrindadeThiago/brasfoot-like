import type { MatchEvent, MatchResult, Side } from "../match/types";
import type { Absence, MatchRecord, PlayerLine } from "./types";

/** Eventos guardados no registro: gols, pênaltis marcados, cartões, lesões e substituições. */
function isKeyEvent(event: MatchEvent): boolean {
  switch (event.type) {
    case "shot":
      return event.outcome === "goal";
    case "penalty_awarded":
    case "yellow_card":
    case "red_card":
    case "injury":
    case "substitution":
      return true;
    default:
      return false;
  }
}

/**
 * Linhas de todos os jogadores do jogo: o registro completo as traz inteiras; o resumido (020 R4)
 * as completa com os titulares que jogaram o tempo todo, sem eventos.
 */
export function playerLines(record: MatchRecord): Record<string, PlayerLine> {
  if (!record.summary || !record.starters) return record.players;
  const lines: Record<string, PlayerLine> = {};
  for (const side of ["home", "away"] as const) {
    for (const playerId of record.starters[side]) {
      lines[playerId] = {
        side,
        minutes: record.fullTime ?? 0,
        goals: 0,
        assists: 0,
        yellows: 0,
        red: false,
      };
    }
  }
  return { ...lines, ...record.players };
}

/** Registro compacto de um jogo resumido: só as linhas com algo a contar (020 R4). */
export function toSummaryRecord(
  record: MatchRecord,
  starters: Record<Side, string[]>,
  fullTime: number,
): MatchRecord {
  const players: Record<string, PlayerLine> = {};
  for (const [playerId, line] of Object.entries(record.players)) {
    const plain =
      line.minutes === fullTime &&
      line.goals === 0 &&
      line.assists === 0 &&
      line.yellows === 0 &&
      !line.red &&
      line.injury === undefined &&
      starters[line.side].includes(playerId);
    if (!plain) players[playerId] = line;
  }
  return { ...record, players, summary: true, starters, fullTime };
}

/** Converte o resultado completo de uma partida no registro compacto da temporada (research R4). */
export function toMatchRecord(
  round: number,
  home: string,
  away: string,
  result: MatchResult,
  sides: Record<string, Side>,
  unavailable: Record<Side, Absence[]>,
): MatchRecord {
  const reds = new Set(
    result.events.filter((event) => event.type === "red_card").map((event) => event.playerId),
  );
  const players: Record<string, PlayerLine> = {};
  for (const [playerId, state] of Object.entries(result.players)) {
    const side = sides[playerId];
    if (!side) continue;
    const line: PlayerLine = {
      side,
      minutes: state.minutesPlayed,
      goals: state.goals,
      assists: state.assists,
      yellows: state.yellowCards,
      red: reds.has(playerId),
    };
    if (state.injury) line.injury = state.injury;
    players[playerId] = line;
  }
  return {
    round,
    home,
    away,
    score: { ...result.score },
    outcome: result.status,
    events: result.events.filter(isKeyEvent),
    stats: result.stats,
    players,
    unavailable,
    ...(result.decision ? { decision: result.decision } : {}),
  };
}
