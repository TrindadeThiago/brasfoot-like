import type { SaveFile } from "@brasfoot-like/save";
import { t } from "../i18n";

/** Variação de força do jogador na última evolução (0 se não houve). */
export function lastEvolution(save: SaveFile, playerId: string): number {
  return save.renewal.lastEvolution?.deltas[playerId] ?? 0;
}

/** Texto da variação: +N, −N ou = (FR-020). */
export function evolutionText(delta: number): string {
  return t("renewal.evolutionValue", {
    direction: delta > 0 ? "up" : delta < 0 ? "down" : "same",
    value: Math.abs(delta),
  });
}
