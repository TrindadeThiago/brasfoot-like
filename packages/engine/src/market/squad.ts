import type { Position } from "../model/catalogs";
import type { CompletedBank } from "../model/types";
import { SQUAD_RULES } from "../renewal/rules";

/** Quantos jogadores o clube tem (inclui emprestados recebidos). */
export function squadSize(world: CompletedBank, clubId: string): number {
  return world.players.filter((player) => player.clubId === clubId).length;
}

/** Cabe mais um jogador sem passar do máximo da 009 (FR-016)? */
export function canAddPlayer(world: CompletedBank, clubId: string): boolean {
  return squadSize(world, clubId) < SQUAD_RULES.max;
}

/** Pode sair um jogador sem ficar abaixo do mínimo, nem da cobertura da posição (FR-016)? */
export function canRemovePlayer(world: CompletedBank, clubId: string, playerId: string): boolean {
  const squad = world.players.filter((player) => player.clubId === clubId);
  const player = squad.find((entry) => entry.id === playerId);
  if (!player) return false;
  if (squad.length - 1 < SQUAD_RULES.min) return false;
  const position: Position = player.position;
  const inPosition = squad.filter((entry) => entry.position === position).length;
  return inPosition - 1 >= SQUAD_RULES.positionMin[position];
}

/** Posição do jogador entre os do clube por força (1 = mais forte; desempate por id). */
export function strengthRank(world: CompletedBank, clubId: string, playerId: string): number {
  const squad = world.players
    .filter((player) => player.clubId === clubId)
    .sort((a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1));
  return squad.findIndex((player) => player.id === playerId) + 1;
}
