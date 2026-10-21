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
