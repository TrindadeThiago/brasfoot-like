import type { SaveFile } from "@brasfoot-like/save";
import { screen, within } from "@testing-library/react";
import { t } from "../../src/i18n";

export function squadOf(save: SaveFile) {
  return save.bank.players.filter((player) => player.clubId === save.clubId);
}

export function nameOf(save: SaveFile, playerId: string): string {
  return save.bank.players.find((player) => player.id === playerId)?.displayName ?? playerId;
}

/** Jogadores fora da relação (nem titulares nem reservas). */
export function outsideOf(save: SaveFile): string[] {
  const used = new Set([...Object.values(save.lineup.starters), ...save.lineup.bench]);
  return squadOf(save)
    .map((player) => player.id)
    .filter((id) => !used.has(id));
}

export const pitch = () => screen.getByRole("region", { name: t("lineup.pitch") });
export const outside = () => screen.getByRole("region", { name: t("lineup.outside") });
export const benchRegion = () => screen.getByRole("region", { name: /^Reservas/ });

/** Botão de um jogador numa região da tela de escalação. */
export function playerButton(region: HTMLElement, name: string): HTMLElement {
  return within(region).getByRole("button", { name: new RegExp(escapeRegExp(name)) });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
