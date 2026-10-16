import {
  type CompletedBank,
  clubUnavailability,
  type Lineup,
  managerAutoLineup,
  preferredFormation,
  type Season,
} from "@brasfoot-like/engine";

/** Escalação inicial do jogador: automática no esquema do clube, postura equilibrada (FR-009). */
export function initialLineup(bank: CompletedBank, season: Season, clubId: string): Lineup {
  const squad = bank.players.filter((player) => player.clubId === clubId);
  const formation = season.formations[clubId] ?? preferredFormation(squad);
  return managerAutoLineup(squad, formation, "balanced", clubUnavailability(season, bank, clubId))
    .lineup;
}
