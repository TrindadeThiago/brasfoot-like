import type { LeagueSeason } from "../career/types";
import { POSITIONS, type Position } from "../model/catalogs";
import type { Club, CompletedBank, CompletedPlayer } from "../model/types";
import { intIrwinHall, triangular } from "../rng/distributions";
import { createRng, type Rng } from "../rng/xoshiro";
import { birthDateFor, personName, pickTraits } from "../worldgen/players";
import { GENERATOR_TUNING } from "../worldgen/tuning";
import { nameBankFor } from "./names";
import { playerRef } from "./retirement";
import { EVOLUTION_RULES, YOUTH_RULES } from "./rules";
import type { PlayerRef, RegulatorState, RenewalState } from "./types";

/** Jovens por clube por temporada: base + 1 por degrau de reputação atingido (R6). */
export function youthCount(reputation: number): number {
  return (
    YOUTH_RULES.perClub.base +
    YOUTH_RULES.perClub.reputationSteps.filter((step) => reputation >= step).length
  );
}

/** Id de jogador pelo número da sequência. */
export function playerId(seq: number): string {
  return `jogador-${String(seq).padStart(5, "0")}`;
}

/** Posição mais carente do elenco em relação à composição-alvo do gerador. */
export function neediestPosition(squad: readonly CompletedPlayer[], rng: Rng): Position {
  const counts = new Map<Position, number>(POSITIONS.map((position) => [position, 0]));
  for (const player of squad) counts.set(player.position, (counts.get(player.position) ?? 0) + 1);
  const shortage = (position: Position) =>
    (GENERATOR_TUNING.squad.min[position] - (counts.get(position) ?? 0)) /
    GENERATOR_TUNING.squad.min[position];
  const best = Math.max(...POSITIONS.map(shortage));
  return rng.pick(POSITIONS.filter((position) => shortage(position) === best));
}

/** Um jovem novo para o clube, numa posição (R6). */
export function createYouth(
  world: CompletedBank,
  club: Club,
  position: Position,
  seq: number,
  regulator: RegulatorState,
  date: string,
  rng: Rng,
): CompletedPlayer {
  const { strength: rules, age, potentialMargin } = YOUTH_RULES;
  const playerAge = rng.int(age[0], age[1]);
  const base = rules.base + rules.perReputation * club.reputation + regulator.strengthOffset;
  const strength = Math.round(
    Math.min(
      EVOLUTION_RULES.maxStrength - 1,
      Math.max(EVOLUTION_RULES.minStrength, base + triangular(rng, -rules.noise, 0, rules.noise)),
    ),
  );
  const margin =
    rng.int(potentialMargin[0], potentialMargin[1]) + Math.round(regulator.potentialBonus);
  const potential = Math.min(
    EVOLUTION_RULES.maxStrength,
    Math.max(strength + 1, strength + margin),
  );
  return {
    id: playerId(seq),
    ...personName(rng, nameBankFor(world, club.countryId)),
    birthDate: birthDateFor(rng, playerAge, date),
    nationalityId: club.countryId,
    clubId: club.id,
    position,
    strength,
    traits: pickTraits(rng, position),
    hidden: {
      potential,
      temperament: intIrwinHall(rng, 1, 100),
      injuryProneness: intIrwinHall(rng, 1, 100),
    },
  };
}

/**
 * Jovens da virada para todos os clubes da competição (FR-008 a FR-010), em ordem de id de clube;
 * a sequência de ids avança no estado devolvido.
 */
export function generateYouth(
  world: CompletedBank,
  league: LeagueSeason,
  renewal: RenewalState,
  careerSeed: string,
  season: number,
  date: string,
): { world: CompletedBank; renewal: RenewalState; arrived: PlayerRef[] } {
  const clubIds = league.divisions.flatMap((entry) => entry.clubIds).sort();
  const players = [...world.players];
  const arrived: PlayerRef[] = [];
  let seq = renewal.nextPlayerSeq;
  for (const clubId of clubIds) {
    const club = world.clubs.find((entry) => entry.id === clubId);
    if (!club) continue;
    const rng = createRng(`${careerSeed}:youth:${season}:${clubId}`);
    for (let index = 0; index < youthCount(club.reputation); index++) {
      const squad = players.filter((player) => player.clubId === clubId);
      const youth = createYouth(
        world,
        club,
        neediestPosition(squad, rng),
        seq,
        renewal.regulator,
        date,
        rng,
      );
      seq += 1;
      players.push(youth);
      arrived.push(playerRef(youth, date));
    }
  }
  return { world: { ...world, players }, renewal: { ...renewal, nextPlayerSeq: seq }, arrived };
}
