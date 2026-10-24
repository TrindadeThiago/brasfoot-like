import { autoLineup } from "../../src/match/auto-lineup";
import { simulateMatch } from "../../src/match/engine";
import { FORMATION_IDS, type FormationId } from "../../src/match/formations";
import { summarizeMatch } from "../../src/match/summary";
import type { Lineup, MatchInput, MatchResult } from "../../src/match/types";
import type { CompletedBank } from "../../src/model/types";
import { createRng } from "../../src/rng/xoshiro";
import { generateDefaultBank } from "../../src/worldgen/generate";
import { completeHiddenAttributes } from "../../src/worldgen/hidden";

export interface Sample {
  homeGoals: number;
  awayGoals: number;
  yellows: number;
  reds: number;
  injuries: number;
  shots: number;
  starterMinutes: number;
  starters: number;
  scorerGoals: number;
}

function sampleOf(result: MatchResult, starters: ReadonlySet<string>): Sample {
  let injuries = 0;
  let minutes = 0;
  let count = 0;
  let scorerGoals = 0;
  for (const [id, line] of Object.entries(result.players)) {
    if (line.injury) injuries += 1;
    scorerGoals += line.goals;
    if (starters.has(id) && !line.subbedOut && !line.sentOff) {
      minutes += line.minutesPlayed;
      count += 1;
    }
  }
  return {
    homeGoals: result.score.home,
    awayGoals: result.score.away,
    yellows: result.stats.home.yellowCards + result.stats.away.yellowCards,
    reds: result.stats.home.redCards + result.stats.away.redCards,
    injuries,
    shots: result.stats.home.shots + result.stats.away.shots,
    starterMinutes: minutes,
    starters: count,
    scorerGoals,
  };
}

/** Banco padrão com escalações automáticas por clube e esquema, para pares sorteados. */
export function comparisonWorld(seed = "equivalencia-resumida"): {
  world: CompletedBank;
  inputs(count: number, label: string): MatchInput[];
} {
  const world = completeHiddenAttributes(
    generateDefaultBank({ seed: "brasfoot-like-default-1" }),
    seed,
  );
  const squads = new Map<string, CompletedBank["players"]>();
  for (const player of world.players) {
    const squad = squads.get(player.clubId) ?? [];
    squad.push(player);
    squads.set(player.clubId, squad);
  }
  const cache = new Map<string, Lineup>();
  const lineupFor = (clubId: string, formation: FormationId): Lineup => {
    const key = `${clubId}|${formation}`;
    let lineup = cache.get(key);
    if (!lineup) {
      const result = autoLineup({ squad: squads.get(clubId) ?? [], formation, benchLimit: 7 });
      if (!result.ok) throw new Error("escalação impossível");
      lineup = result.lineup;
      cache.set(key, lineup);
    }
    return lineup;
  };
  const divisions = world.competitions.flatMap((competition) => competition.divisions);
  return {
    world,
    inputs(count, label) {
      const rng = createRng(`${seed}:${label}`);
      const out: MatchInput[] = [];
      for (let index = 0; index < count; index++) {
        const division = divisions[index % divisions.length];
        if (!division) continue;
        const [home, away] = rng.shuffle(division.clubIds) as [string, string];
        out.push({
          home: {
            clubId: home,
            squad: squads.get(home) ?? [],
            lineup: lineupFor(home, rng.pick(FORMATION_IDS)),
          },
          away: {
            clubId: away,
            squad: squads.get(away) ?? [],
            lineup: lineupFor(away, rng.pick(FORMATION_IDS)),
          },
          seed: `${label}:${index}`,
          fatigue: { drainPer90: 40, penaltyBpPerPoint: 40 },
        });
      }
      return out;
    },
  };
}

export function samples(inputs: readonly MatchInput[], kind: "full" | "summary"): Sample[] {
  return inputs.map((input) => {
    const starters = new Set([
      ...Object.values(input.home.lineup.starters),
      ...Object.values(input.away.lineup.starters),
    ]);
    if (kind === "summary") return sampleOf(summarizeMatch(input), starters);
    const full = simulateMatch(input);
    if (!full.ok) throw new Error("simulação falhou");
    return sampleOf(full.result, starters);
  });
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / (values.length || 1);

export interface Summary {
  goals: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  yellows: number;
  reds: number;
  injuries: number;
  starterMinutes: number;
  scoreDistribution: Map<string, number>;
}

export function summarize(list: readonly Sample[]): Summary {
  const dist = new Map<string, number>();
  for (const s of list) {
    const key = `${Math.min(s.homeGoals, 5)}-${Math.min(s.awayGoals, 5)}`;
    dist.set(key, (dist.get(key) ?? 0) + 1 / list.length);
  }
  return {
    goals: mean(list.map((s) => s.homeGoals + s.awayGoals)),
    homeWin: mean(list.map((s) => (s.homeGoals > s.awayGoals ? 1 : 0))),
    draw: mean(list.map((s) => (s.homeGoals === s.awayGoals ? 1 : 0))),
    awayWin: mean(list.map((s) => (s.homeGoals < s.awayGoals ? 1 : 0))),
    yellows: mean(list.map((s) => s.yellows)),
    reds: mean(list.map((s) => s.reds)),
    injuries: mean(list.map((s) => s.injuries)),
    starterMinutes: mean(
      list.filter((s) => s.starters > 0).map((s) => s.starterMinutes / s.starters),
    ),
    scoreDistribution: dist,
  };
}

/** Distância de variação total entre as distribuições de placar. */
export function totalVariation(a: Summary, b: Summary): number {
  const keys = new Set([...a.scoreDistribution.keys(), ...b.scoreDistribution.keys()]);
  let sum = 0;
  for (const key of keys)
    sum += Math.abs((a.scoreDistribution.get(key) ?? 0) - (b.scoreDistribution.get(key) ?? 0));
  return sum / 2;
}
