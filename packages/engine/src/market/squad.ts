import type { Position } from "../model/catalogs";
import type { CompletedBank } from "../model/types";
import { SQUAD_RULES } from "../renewal/rules";
import { rulesCompetitionOf } from "../world/countries";
import { squadOf } from "../world/squads";
import { aiMarketRules } from "./ai/rules";

/** Quantos jogadores o clube tem (inclui emprestados recebidos). */
export function squadSize(world: CompletedBank, clubId: string): number {
  return squadOf(world, clubId).length;
}

/** Teto por posição das regras do país do clube (011 R3, 020 R1). */
export function positionCap(world: CompletedBank, clubId: string, position: Position): number {
  return aiMarketRules(world, rulesCompetitionOf(world, clubId).id).positionMax[position];
}

/** Máximo de jogadores do clube: o do jogador (`managerClubId`) é maior que o da IA. */
export function squadLimit(clubId: string, managerClubId?: string): number {
  return clubId === managerClubId ? SQUAD_RULES.userMax : SQUAD_RULES.max;
}

/**
 * Cabe mais um jogador sem passar do máximo (FR-016) e, com a posição informada, do teto por
 * posição (011 FR-009)? O clube do jogador só tem o máximo total.
 */
export function canAddPlayer(
  world: CompletedBank,
  clubId: string,
  position?: Position,
  managerClubId?: string,
): boolean {
  if (squadSize(world, clubId) >= squadLimit(clubId, managerClubId)) return false;
  if (position === undefined || clubId === managerClubId) return true;
  const inPosition = squadOf(world, clubId).filter((player) => player.position === position).length;
  return inPosition < positionCap(world, clubId, position);
}

/** Pode sair um jogador sem ficar abaixo do mínimo, nem da cobertura da posição (FR-016)? */
export function canRemovePlayer(world: CompletedBank, clubId: string, playerId: string): boolean {
  const squad = squadOf(world, clubId);
  const player = squad.find((entry) => entry.id === playerId);
  if (!player) return false;
  if (squad.length - 1 < SQUAD_RULES.min) return false;
  const position: Position = player.position;
  const inPosition = squad.filter((entry) => entry.position === position).length;
  return inPosition - 1 >= SQUAD_RULES.positionMin[position];
}

/** Posição do jogador entre os do clube por força (1 = mais forte; desempate por id). */
export function strengthRank(world: CompletedBank, clubId: string, playerId: string): number {
  const squad = [...squadOf(world, clubId)].sort(
    (a, b) => b.strength - a.strength || (a.id < b.id ? -1 : 1),
  );
  return squad.findIndex((player) => player.id === playerId) + 1;
}
