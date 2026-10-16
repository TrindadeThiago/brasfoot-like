import type { CompletedPlayer } from "../model/types";
import { MATCH_REALISM_LIMITS } from "./limits";
import type { MatchInput, MatchResult } from "./types";

export interface MatchMetrics {
  matches: number;
  goalsPerMatch: number;
  drawRate: number;
  homeWinRate: number;
  awayWinRate: number;
  yellowsPerMatch: number;
  redsPerMatch: number;
  injuriesPerMatch: number;
  penaltiesPerMatch: number;
  penaltyConversion: number;
  shotsPerMatch: number;
  onTargetRate: number;
  sevenGoalRate: number;
  possessionInRangeRate: number;
  /** Cartões por minuto jogado de quem tem temperamento alto ÷ baixo. */
  temperamentCardRatio: number;
  /** Lesões por minuto jogado de quem tem propensão alta ÷ baixa. */
  pronenessInjuryRatio: number;
}

interface Bucket {
  events: number;
  minutes: number;
}

const rate = (bucket: Bucket) => (bucket.minutes === 0 ? 0 : bucket.events / bucket.minutes);
const ratio = (high: Bucket, low: Bucket) =>
  rate(low) === 0 ? Number.POSITIVE_INFINITY : rate(high) / rate(low);

/** Acumula métricas de muitas partidas (usado pelos testes de realismo e por `pnpm sim:matches`). */
export function createMetricsAccumulator() {
  const limits = MATCH_REALISM_LIMITS;
  let matches = 0;
  let goals = 0;
  let draws = 0;
  let homeWins = 0;
  let awayWins = 0;
  let yellows = 0;
  let reds = 0;
  let injuries = 0;
  let penalties = 0;
  let penaltyGoals = 0;
  let shots = 0;
  let onTarget = 0;
  let sevenGoals = 0;
  let possessionInRange = 0;
  const cards = { high: { events: 0, minutes: 0 }, low: { events: 0, minutes: 0 } };
  const hurts = { high: { events: 0, minutes: 0 }, low: { events: 0, minutes: 0 } };

  function add(input: MatchInput, result: MatchResult): void {
    matches += 1;
    const { home, away } = result.score;
    goals += home + away;
    if (home === away) draws += 1;
    else if (home > away) homeWins += 1;
    else awayWins += 1;
    if (home >= 7 || away >= 7) sevenGoals += 1;
    for (const side of ["home", "away"] as const) {
      const stats = result.stats[side];
      yellows += stats.yellowCards;
      reds += stats.redCards;
      penalties += stats.penalties;
      penaltyGoals += stats.penaltiesScored;
      shots += stats.shots;
      onTarget += stats.shotsOnTarget;
    }
    const [minPossession, maxPossession] = limits.possessionRange;
    if (
      result.stats.home.possession >= minPossession &&
      result.stats.home.possession <= maxPossession
    ) {
      possessionInRange += 1;
    }

    const players = new Map<string, CompletedPlayer>();
    for (const player of [...input.home.squad, ...input.away.squad]) players.set(player.id, player);
    const cardCount = new Map<string, number>();
    const injuryCount = new Map<string, number>();
    for (const event of result.events) {
      if (
        event.type === "yellow_card" ||
        (event.type === "red_card" && event.reason === "direct")
      ) {
        cardCount.set(event.playerId, (cardCount.get(event.playerId) ?? 0) + 1);
      } else if (event.type === "injury") {
        injuries += 1;
        injuryCount.set(event.playerId, (injuryCount.get(event.playerId) ?? 0) + 1);
      }
    }
    for (const [playerId, state] of Object.entries(result.players)) {
      const player = players.get(playerId);
      if (!player || state.minutesPlayed === 0) continue;
      const { temperament, injuryProneness } = player.hidden;
      const cardBucket =
        temperament >= limits.highAttribute
          ? cards.high
          : temperament <= limits.lowAttribute
            ? cards.low
            : undefined;
      if (cardBucket) {
        cardBucket.events += cardCount.get(playerId) ?? 0;
        cardBucket.minutes += state.minutesPlayed;
      }
      const injuryBucket =
        injuryProneness >= limits.highAttribute
          ? hurts.high
          : injuryProneness <= limits.lowAttribute
            ? hurts.low
            : undefined;
      if (injuryBucket) {
        injuryBucket.events += injuryCount.get(playerId) ?? 0;
        injuryBucket.minutes += state.minutesPlayed;
      }
    }
  }

  function summary(): MatchMetrics {
    const per = (value: number) => (matches === 0 ? 0 : value / matches);
    return {
      matches,
      goalsPerMatch: per(goals),
      drawRate: per(draws),
      homeWinRate: per(homeWins),
      awayWinRate: per(awayWins),
      yellowsPerMatch: per(yellows),
      redsPerMatch: per(reds),
      injuriesPerMatch: per(injuries),
      penaltiesPerMatch: per(penalties),
      penaltyConversion: penalties === 0 ? 0 : penaltyGoals / penalties,
      shotsPerMatch: per(shots),
      onTargetRate: shots === 0 ? 0 : onTarget / shots,
      sevenGoalRate: per(sevenGoals),
      possessionInRangeRate: per(possessionInRange),
      temperamentCardRatio: ratio(cards.high, cards.low),
      pronenessInjuryRatio: ratio(hurts.high, hurts.low),
    };
  }

  return { add, summary };
}

export interface MetricCheck {
  metric: keyof MatchMetrics;
  value: number;
  min?: number;
  max?: number;
  ok: boolean;
}

/** Confere as métricas gerais contra as faixas (as de cenário ficam nos testes). */
export function checkRealism(metrics: MatchMetrics): MetricCheck[] {
  const limits = MATCH_REALISM_LIMITS;
  const range = (
    metric: keyof MatchMetrics,
    [min, max]: readonly [number, number],
  ): MetricCheck => {
    const value = metrics[metric];
    return { metric, value, min, max, ok: value >= min && value <= max };
  };
  const atLeast = (metric: keyof MatchMetrics, min: number): MetricCheck => {
    const value = metrics[metric];
    return { metric, value, min, ok: value >= min };
  };
  const atMost = (metric: keyof MatchMetrics, max: number): MetricCheck => {
    const value = metrics[metric];
    return { metric, value, max, ok: value <= max };
  };
  return [
    range("goalsPerMatch", limits.goalsPerMatch),
    range("drawRate", limits.drawRate),
    range("yellowsPerMatch", limits.yellowsPerMatch),
    range("redsPerMatch", limits.redsPerMatch),
    atLeast("temperamentCardRatio", limits.minTemperamentCardRatio),
    range("injuriesPerMatch", limits.injuriesPerMatch),
    atLeast("pronenessInjuryRatio", limits.minPronenessInjuryRatio),
    range("penaltiesPerMatch", limits.penaltiesPerMatch),
    range("penaltyConversion", limits.penaltyConversion),
    range("shotsPerMatch", limits.shotsPerMatch),
    range("onTargetRate", limits.onTargetRate),
    atMost("sevenGoalRate", limits.maxSevenGoalRate),
    atLeast("possessionInRangeRate", limits.minPossessionInRangeRate),
  ];
}
