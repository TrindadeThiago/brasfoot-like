import { ageOn } from "../calendar/date";
import type { LeagueSeason } from "../career/types";
import type { CompletedBank, CompletedPlayer } from "../model/types";
import { createRng } from "../rng/xoshiro";
import { RETIREMENT_RULES } from "./rules";
import type { PlayerRef } from "./types";

/** Chance de aposentadoria numa virada pela idade (R5). */
export function retirementChance(age: number): number {
  const { minAge, base, perYear, certainAge } = RETIREMENT_RULES;
  if (age < minAge) return 0;
  if (age >= certainAge) return 1;
  return Math.min(1, base + perYear * (age - minAge));
}

/** Cópia dos dados visíveis de um jogador (para avisos de quem saiu do mundo). */
export function playerRef(player: CompletedPlayer, date: string): PlayerRef {
  return {
    playerId: player.id,
    displayName: player.displayName,
    position: player.position,
    age: ageOn(player.birthDate, date),
    strength: player.strength,
  };
}

/** Aposentadorias da virada (FR-006, FR-007): sorteio por jogador, determinístico pela seed. */
export function retirePlayers(
  world: CompletedBank,
  league: LeagueSeason,
  careerSeed: string,
  season: number,
  date: string,
): { world: CompletedBank; retired: PlayerRef[] } {
  const clubs = new Set(league.divisions.flatMap((entry) => entry.clubIds));
  const retired: PlayerRef[] = [];
  const players = world.players.filter((player) => {
    if (!clubs.has(player.clubId)) return true;
    const chance = retirementChance(ageOn(player.birthDate, date));
    if (chance === 0) return true;
    const roll = createRng(`${careerSeed}:retire:${season}:${player.id}`).float();
    if (roll >= chance) return true;
    retired.push(playerRef(player, date));
    return false;
  });
  retired.sort((a, b) => (a.playerId < b.playerId ? -1 : 1));
  return { world: { ...world, players }, retired };
}
