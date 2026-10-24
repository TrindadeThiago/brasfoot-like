import type { KnockoutHomeRule } from "../model/catalogs";
import { createRng } from "../rng/xoshiro";

/** Clube participante de um sorteio, com o que as regras de mando e de cabeça de chave leem. */
export interface DrawClub {
  id: string;
  reputation: number;
  /** Nível da divisão do clube na competição principal (1 = a mais alta). */
  division: number;
  /** Posição na classificação geral da fase de pontos anterior (019); ausente numa copa comum. */
  rank?: number;
}

export interface DrawRules {
  home: KnockoutHomeRule;
  seeded: boolean;
  legs: 1 | 2;
  neutral: boolean;
}

export interface DrawnPair {
  home: string;
  away: string;
}

const byId = (a: DrawClub, b: DrawClub) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Quem joga em casa (a ida, em ida e volta) segundo a regra da fase (018 R7). */
function hostOf(a: DrawClub, b: DrawClub, rule: KnockoutHomeRule, coin: () => boolean): DrawClub[] {
  if (rule === "overall") {
    if (a.rank !== undefined && b.rank !== undefined && a.rank !== b.rank) {
      return a.rank < b.rank ? [a, b] : [b, a];
    }
    // sem classificação geral (copa comum, ou empate): vale a reputação, como `ranking`
    return hostOf(a, b, "ranking", coin);
  }
  if (rule === "ranking" && a.reputation !== b.reputation) {
    return a.reputation > b.reputation ? [a, b] : [b, a];
  }
  if (rule === "ranking") return a.id < b.id ? [a, b] : [b, a];
  if (rule === "division" && a.division !== b.division) {
    // Joga em casa o de divisão mais baixa (nível numérico maior).
    return a.division > b.division ? [a, b] : [b, a];
  }
  return coin() ? [a, b] : [b, a];
}

function plainPairs(shuffled: readonly DrawClub[]): [DrawClub, DrawClub][] {
  const pairs: [DrawClub, DrawClub][] = [];
  for (let index = 0; index < shuffled.length; index += 2) {
    pairs.push([shuffled[index] as DrawClub, shuffled[index + 1] as DrawClub]);
  }
  return pairs;
}

/**
 * Cabeças de chave (018 R6): os `n / 4` de maior reputação (empate pelo id) ficam em confrontos
 * diferentes, cada um contra um não-cabeça. Se houvesse mais cabeças que confrontos, os excedentes
 * se enfrentariam na ordem dos dados em vez de falhar. `shuffled` já vem embaralhado pela seed.
 */
function seededPairs(shuffled: readonly DrawClub[]): [DrawClub, DrawClub][] {
  const total = shuffled.length / 2;
  const ranked = [...shuffled].sort((a, b) => b.reputation - a.reputation || byId(a, b));
  const seeds = ranked.slice(0, total >= 2 ? Math.floor(shuffled.length / 4) : 0);
  const isSeed = new Set(seeds.map((club) => club.id));
  const others = shuffled.filter((club) => !isSeed.has(club.id));
  // `seeds` está em ordem de reputação; a ordem dos confrontos vem da seed pelo embaralhamento.
  const order = shuffled.filter((club) => isSeed.has(club.id));
  const slots: DrawClub[][] = Array.from({ length: total }, () => []);
  for (const [index, club] of order.entries()) slots[index % total]?.push(club);
  for (const club of others) {
    const open = slots.find((slot) => slot.length < 2);
    open?.push(club);
  }
  return slots.map((slot) => [slot[0] as DrawClub, slot[1] as DrawClub]);
}

/**
 * Sorteio de uma fase (018 R6): emparelha os participantes pela seed, independente da ordem em que
 * chegam, e define o mandante pela regra da fase. Com número ímpar de clubes, falha.
 */
export function drawPhase(
  participants: readonly DrawClub[],
  rules: DrawRules,
  seed: string,
): DrawnPair[] {
  if (participants.length % 2 !== 0) {
    throw new Error(`sorteio com número ímpar de clubes: ${participants.length}`);
  }
  const rng = createRng(seed);
  const shuffled = rng.fork("shuffle").shuffle([...participants].sort(byId));
  const coin = rng.fork("home");
  const pairs: DrawnPair[] = [];
  for (const [a, b] of rules.seeded ? seededPairs(shuffled) : plainPairs(shuffled)) {
    const [home, away] = hostOf(a, b, rules.home, () => coin.float() < 0.5);
    pairs.push({ home: (home as DrawClub).id, away: (away as DrawClub).id });
  }
  return pairs;
}
