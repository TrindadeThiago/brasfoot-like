import { ageOn, seasonDate } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { triangular } from "../rng/distributions";
import { createRng, type Rng } from "../rng/xoshiro";
import { playerLines } from "../season/record";
import type { MatchRecord } from "../season/types";
import { EVOLUTION_RULES } from "./rules";
import type { EvolutionRecord } from "./types";

const MATCH_MINUTES = 90;

/** Rodada da liga em que acontece a evolução do meio da temporada (⌈R/2⌉, R3). */
export function midSeasonRound(league: LeagueSeason): number {
  const rounds = Math.max(...league.divisions.map((season) => season.calendar.length));
  return Math.ceil(rounds / 2);
}

/**
 * Minutos de cada jogador nas partidas da liga com rodada em [fromRound, toRound]. As outras
 * competições da carreira (`extra`, 017 R9) contam todas as partidas já disputadas.
 */
export function minutesInRounds(
  league: LeagueSeason,
  fromRound: number,
  toRound: number,
  extra: readonly LeagueSeason[] = [],
): Map<string, number> {
  const minutes = new Map<string, number>();
  const add = (record: MatchRecord) => {
    for (const [playerId, line] of Object.entries(playerLines(record))) {
      minutes.set(playerId, (minutes.get(playerId) ?? 0) + line.minutes);
    }
  };
  for (const season of league.divisions) {
    for (const record of season.records) {
      if (record.round < fromRound || record.round > toRound) continue;
      add(record);
    }
  }
  for (const other of extra) {
    for (const season of other.divisions) season.records.forEach(add);
  }
  return minutes;
}

/** Partidas de cada clube na janela de rodadas (para os minutos possíveis). */
function matchesInRounds(
  league: LeagueSeason,
  fromRound: number,
  toRound: number,
  extra: readonly LeagueSeason[] = [],
): Map<string, number> {
  const matches = new Map<string, number>();
  const add = (record: MatchRecord) => {
    for (const clubId of [record.home, record.away]) {
      matches.set(clubId, (matches.get(clubId) ?? 0) + 1);
    }
  };
  for (const season of league.divisions) {
    for (const record of season.records) {
      if (record.round < fromRound || record.round > toRound) continue;
      add(record);
    }
  }
  for (const other of extra) {
    for (const season of other.divisions) season.records.forEach(add);
  }
  return matches;
}

function growthRate(age: number): number {
  for (const [maxAge, rate] of EVOLUTION_RULES.growth) if (age <= maxAge) return rate;
  return 0;
}

/**
 * Variação de força de um jogador numa evolução (R4): crescimento rumo ao potencial até 26 anos
 * (acelerado pela participação 0..1), estabilidade de 27 a 30, declínio a partir de 31.
 * Arredondamento estocástico para inteiro.
 */
export function evolutionDelta(
  player: CompletedPlayer,
  age: number,
  participation: number,
  rng: Rng,
): number {
  const { noise, primeNoise, declineFrom, decline, minutes } = EVOLUTION_RULES;
  let delta: number;
  if (age <= 26) {
    const margin = Math.max(0, player.hidden.potential - player.strength);
    const factor = minutes.base + minutes.weight * Math.min(1, Math.max(0, participation));
    delta = margin * growthRate(age) * factor + triangular(rng, -noise, 0, noise);
  } else if (age < declineFrom) {
    delta = triangular(rng, -primeNoise, 0, primeNoise);
  } else {
    delta =
      -(decline.base + decline.perYear * (age - declineFrom)) + triangular(rng, -noise, 0, noise);
  }
  return Math.floor(delta + rng.float());
}

/**
 * Aplica uma evolução a todos os jogadores dos clubes da competição (FR-001 a FR-005). A força fica
 * em [20, potencial] (e ≤ 99); o potencial não muda. Determinística e independente da ordem.
 */
export function evolvePlayers(
  world: CompletedBank,
  league: LeagueSeason,
  careerSeed: string,
  moment: "mid" | "end",
  fromRound: number,
  toRound: number,
  extra: readonly LeagueSeason[] = [],
): { world: CompletedBank; record: EvolutionRecord } {
  const date = seasonDate(world.manifest.referenceDate, league.year);
  const clubs = new Set(league.divisions.flatMap((season) => season.clubIds));
  const minutes = minutesInRounds(league, fromRound, toRound, extra);
  const matches = matchesInRounds(league, fromRound, toRound, extra);
  const deltas: Record<string, number> = {};
  const played: Record<string, number> = {};
  const players = world.players.map((player) => {
    if (!clubs.has(player.clubId)) return player;
    const possible = (matches.get(player.clubId) ?? 0) * MATCH_MINUTES;
    const own = minutes.get(player.id) ?? 0;
    const rng = createRng(`${careerSeed}:evolve:${league.number}:${moment}:${player.id}`);
    const delta = evolutionDelta(
      player,
      ageOn(player.birthDate, date),
      possible ? own / possible : 0,
      rng,
    );
    const ceiling = Math.max(
      EVOLUTION_RULES.minStrength,
      Math.min(EVOLUTION_RULES.maxStrength, player.hidden.potential),
    );
    const strength = Math.min(
      ceiling,
      Math.max(EVOLUTION_RULES.minStrength, player.strength + delta),
    );
    deltas[player.id] = strength - player.strength;
    played[player.id] = own;
    return strength === player.strength ? player : { ...player, strength };
  });
  return {
    world: { ...world, players },
    record: { season: league.number, moment, deltas, minutes: played },
  };
}
