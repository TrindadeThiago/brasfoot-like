import { MATCH_TUNING } from "./tuning";
import type { MatchDecision, MatchResult, MatchState, Side, TeamStats } from "./types";

function teamStats(state: MatchState, side: Side, possession: number): TeamStats {
  const stats: TeamStats = {
    shots: 0,
    shotsOnTarget: 0,
    possession,
    yellowCards: 0,
    redCards: 0,
    penalties: 0,
    penaltiesScored: 0,
  };
  for (const event of state.events) {
    if (!("side" in event) || event.side !== side) continue;
    if (event.type === "shot") {
      stats.shots += 1;
      if (event.outcome === "goal" || event.outcome === "saved") stats.shotsOnTarget += 1;
      if (event.kind === "penalty") {
        stats.penalties += 1;
        if (event.outcome === "goal") stats.penaltiesScored += 1;
      }
    } else if (event.type === "yellow_card") {
      stats.yellowCards += 1;
    } else if (event.type === "red_card") {
      stats.redCards += 1;
    }
  }
  return stats;
}

/** Placar final; partida encerrada vale 3 a 0 para o adversário, salvo placar mais favorável. */
function finalScore(state: MatchState): Record<Side, number> {
  if (state.status !== "abandoned") return { ...state.score };
  const abandoned = [...state.events].reverse().find((event) => event.type === "abandoned");
  if (!abandoned || !("side" in abandoned)) return { ...state.score };
  const loser = abandoned.side;
  const winner: Side = loser === "home" ? "away" : "home";
  const minimum = MATCH_TUNING.abandonedScore;
  if (state.score[winner] - state.score[loser] >= minimum) return { ...state.score };
  return { [loser]: 0, [winner]: minimum } as Record<Side, number>;
}

/** Quem avançou num jogo com `decider`; partida abandonada vale o placar atribuído. */
function decisionOf(state: MatchState): MatchDecision | undefined {
  if (state.decision) return state.decision;
  const decider = state.input.decider;
  if (!decider || state.status !== "abandoned") return undefined;
  const score = finalScore(state);
  const home = decider.before.home.goals + score.home;
  const away = decider.before.away.goals + score.away;
  return { by: "aggregate", winner: home >= away ? "home" : "away" };
}

/** Resultado de uma partida encerrada (FR-031, FR-032). */
export function matchResult(state: MatchState): MatchResult {
  if (state.status !== "finished" && state.status !== "abandoned") {
    throw new Error(`a partida ainda não terminou (status ${state.status})`);
  }
  const decision = decisionOf(state);
  const { home, total } = state.possession;
  const homePossession = total === 0 ? 50 : Math.round((100 * home) / total);
  return {
    score: finalScore(state),
    status: state.status,
    events: state.events,
    stats: {
      home: teamStats(state, "home", homePossession),
      away: teamStats(state, "away", 100 - homePossession),
    },
    players: { ...state.teams.home.players, ...state.teams.away.players },
    ...(decision ? { decision } : {}),
  };
}
