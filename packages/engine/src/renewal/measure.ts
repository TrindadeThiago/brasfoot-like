import { ageOn } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import type { CompletedBank } from "../model/types";
import { PROSPECT_POTENTIAL, REGULATOR_RULES, STAR_THRESHOLD } from "./rules";
import type { RenewalState, WorldMeasure } from "./types";

/** Percentil pelo método do posto mais próximo sobre valores ordenados. */
function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.floor(fraction * (sorted.length - 1))] ?? 0;
}

/** Distribuição de força e idade dos jogadores dos clubes da competição (R1, R9). */
export function measureWorld(
  world: CompletedBank,
  league: LeagueSeason,
  date: string,
): WorldMeasure {
  const clubs = new Set(league.divisions.flatMap((season) => season.clubIds));
  const players = world.players.filter((player) => clubs.has(player.clubId));
  const strengths = players.map((player) => player.strength).sort((a, b) => a - b);
  const total = strengths.reduce((sum, value) => sum + value, 0);
  const ages = players.reduce((sum, player) => sum + ageOn(player.birthDate, date), 0);
  return {
    players: players.length,
    mean: players.length ? total / players.length : 0,
    p10: percentile(strengths, 0.1),
    p50: percentile(strengths, 0.5),
    p90: percentile(strengths, 0.9),
    max: strengths.at(-1) ?? 0,
    stars: strengths.filter((value) => value >= STAR_THRESHOLD).length,
    prospects: players.filter(
      (player) =>
        player.hidden.potential >= PROSPECT_POTENTIAL &&
        ageOn(player.birthDate, date) <= REGULATOR_RULES.prospectAge,
    ).length,
    meanAge: players.length ? ages / players.length : 0,
  };
}

/** Número sequencial de um id `prefixo-NNNNN` (0 se não tiver). */
export function playerSeq(id: string): number {
  const value = Number(id.split("-").at(-1));
  return Number.isInteger(value) ? value : 0;
}

/** Estado inicial da renovação: próximo id depois do maior existente, regulador neutro. */
export function initialRenewal(world: CompletedBank): RenewalState {
  const max = world.players.reduce((highest, player) => Math.max(highest, playerSeq(player.id)), 0);
  return { nextPlayerSeq: max + 1, regulator: { strengthOffset: 0, potentialBonus: 0 } };
}
