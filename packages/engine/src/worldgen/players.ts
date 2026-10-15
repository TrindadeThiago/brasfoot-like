import { civilFromDays, daysFromCivil, formatIsoDate, parseIsoDate } from "../calendar/date.js";
import { POSITIONS, type Position, type Trait } from "../model/catalogs.js";
import type { Player } from "../model/types.js";
import { bell, intTriangular } from "../rng/distributions.js";
import type { Rng } from "../rng/xoshiro.js";
import type { GeneratedClub } from "./clubs.js";
import type { NameBank } from "./name-banks/schema.js";
import { composeSquad } from "./squads.js";
import { GENERATOR_TUNING } from "./tuning.js";

type Role = "starter" | "reserve" | "extra";

function roleFor(position: Position, slot: number): Role {
  const { starters, reserves } = GENERATOR_TUNING.squad;
  if (slot < starters[position]) return "starter";
  if (slot < starters[position] + reserves[position]) return "reserve";
  return "extra";
}

/** Data de nascimento sorteada de modo que a idade na data de referência seja `age`. */
function birthDateFor(rng: Rng, age: number, referenceDate: string): string {
  const reference = parseIsoDate(referenceDate);
  if (!reference) throw new Error(`data de referência inválida: ${referenceDate}`);
  const latest = daysFromCivil({ ...reference, year: reference.year - age });
  const earliest = daysFromCivil({ ...reference, year: reference.year - age - 1 }) + 1;
  return formatIsoDate(civilFromDays(rng.int(earliest, latest)));
}

function ageOffset(age: number): number {
  for (const [maxAge, offset] of GENERATOR_TUNING.ageOffset) {
    if (age <= maxAge) return offset;
  }
  return 0;
}

function pickTraits(rng: Rng, position: Position): Trait[] {
  const { chanceAtLeastOne, chanceSecond, weights } = GENERATOR_TUNING.traits;
  if (rng.float() >= chanceAtLeastOne) return [];
  const options = Object.entries(weights[position]).map(([value, weight]) => ({
    value: value as Trait,
    weight: weight as number,
  }));
  const first = rng.weighted(options);
  const rest = options.filter((option) => option.value !== first);
  if (rest.length === 0 || rng.float() >= chanceSecond) return [first];
  return [first, rng.weighted(rest)];
}

function strengthFor(rng: Rng, club: GeneratedClub, role: Role, age: number): number {
  const { roleOffset, strengthNoise, strengthClamp, star } = GENERATOR_TUNING;
  let strength = bell(rng, club.level + roleOffset[role] + ageOffset(age), strengthNoise);
  if (role === "starter" && rng.float() < star.chance[club.tier]) {
    strength += rng.int(star.bonus[0], star.bonus[1]);
  }
  return Math.min(strengthClamp[1], Math.max(strengthClamp[0], Math.round(strength)));
}

function personName(rng: Rng, names: NameBank): { name: string; displayName: string } {
  const first = rng.pick(names.firstNames);
  const middle = rng.pick(names.surnames);
  const last = rng.pick(names.surnames.filter((surname) => surname !== middle));
  return { name: `${first} ${middle} ${last}`, displayName: `${first} ${last}` };
}

/**
 * Gera o elenco de um clube. `nextId` devolve o próximo id de jogador (sequencial no banco).
 * Atributos ocultos não são gerados aqui (FR-017a).
 */
export function generateSquad(
  rng: Rng,
  club: GeneratedClub,
  names: NameBank,
  referenceDate: string,
  nationalityId: string,
  nextId: () => string,
): Player[] {
  const counts = composeSquad(rng.fork("squad"));
  const players: Player[] = [];
  for (const position of POSITIONS) {
    for (let slot = 0; slot < counts[position]; slot++) {
      const playerRng = rng.fork(`player:${position}:${slot}`);
      const role = roleFor(position, slot);
      const ageRange = role === "extra" ? GENERATOR_TUNING.age.extra : GENERATOR_TUNING.age.core;
      const age = intTriangular(playerRng, ageRange.min, ageRange.mode, ageRange.max);
      players.push({
        id: nextId(),
        ...personName(playerRng, names),
        birthDate: birthDateFor(playerRng, age, referenceDate),
        nationalityId,
        clubId: club.club.id,
        position,
        strength: strengthFor(playerRng, club, role, age),
        traits: pickTraits(playerRng, position),
      });
    }
  }
  return players;
}
