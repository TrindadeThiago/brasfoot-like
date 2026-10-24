import type { CompletedPlayer } from "../model/types";

interface Index {
  length: number;
  byClub: Map<string, CompletedPlayer[]>;
}

/** Elencos por clube, memorizados por lista de jogadores (as listas do mundo não mudam no lugar). */
const INDEX = new WeakMap<readonly CompletedPlayer[], Index>();

function indexOf(players: readonly CompletedPlayer[]): Index {
  const hit = INDEX.get(players);
  if (hit && hit.length === players.length) return hit;
  const byClub = new Map<string, CompletedPlayer[]>();
  for (const player of players) {
    const squad = byClub.get(player.clubId);
    if (squad) squad.push(player);
    else byClub.set(player.clubId, [player]);
  }
  const index = { length: players.length, byClub };
  INDEX.set(players, index);
  return index;
}

const NONE: readonly CompletedPlayer[] = [];

/**
 * Elenco do clube (incluídos os emprestados que ele recebeu), na ordem do mundo. O índice é
 * construído uma vez por lista de jogadores: consultar o elenco de um clube custa o tamanho dele,
 * não o do mundo (020 R12, mundo de ~11 000 jogadores).
 */
export function squadOf(
  world: { players: readonly CompletedPlayer[] },
  clubId: string,
): readonly CompletedPlayer[] {
  return indexOf(world.players).byClub.get(clubId) ?? NONE;
}

const BY_ID = new WeakMap<
  readonly CompletedPlayer[],
  { length: number; map: Map<string, CompletedPlayer> }
>();

/** Jogador do mundo pelo id, em tempo constante (índice por lista de jogadores). */
export function playerById(
  world: { players: readonly CompletedPlayer[] },
  playerId: string,
): CompletedPlayer | undefined {
  let hit = BY_ID.get(world.players);
  if (!hit || hit.length !== world.players.length) {
    hit = { length: world.players.length, map: new Map(world.players.map((p) => [p.id, p])) };
    BY_ID.set(world.players, hit);
  }
  return hit.map.get(playerId);
}

const BY_POSITION = new WeakMap<
  readonly CompletedPlayer[],
  { length: number; map: Map<string, CompletedPlayer[]> }
>();

/** Jogadores do mundo numa posição, do mais forte ao mais fraco (desempate por id); índice por lista. */
export function playersAt(
  world: { players: readonly CompletedPlayer[] },
  position: string,
): readonly CompletedPlayer[] {
  let hit = BY_POSITION.get(world.players);
  if (!hit || hit.length !== world.players.length) {
    const map = new Map<string, CompletedPlayer[]>();
    for (const player of world.players) {
      const list = map.get(player.position);
      if (list) list.push(player);
      else map.set(player.position, [player]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    }
    hit = { length: world.players.length, map };
    BY_POSITION.set(world.players, hit);
  }
  return hit.map.get(position) ?? NONE;
}
