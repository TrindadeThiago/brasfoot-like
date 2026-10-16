import type { Position } from "../model/catalogs";

/** Rendimento de um jogador numa vaga de outra posição (research.md R3). Tabela simétrica. */
const PAIRS: Record<string, number> = {
  "FB|CB": 0.9,
  "DM|MF": 0.92,
  "CB|DM": 0.88,
  "MF|FW": 0.88,
  "FB|DM": 0.85,
  "FB|MF": 0.85,
  "FB|FW": 0.75,
  "DM|FW": 0.75,
  "CB|MF": 0.75,
  "CB|FW": 0.65,
};

/** Goleiro na linha ou jogador de linha no gol: a pior combinação, nos dois sentidos. */
const GOALKEEPER_SWAP = 0.3;

export function adequacy(playerPosition: Position, slotPosition: Position): number {
  if (playerPosition === slotPosition) return 1;
  if (playerPosition === "GK" || slotPosition === "GK") return GOALKEEPER_SWAP;
  return (
    PAIRS[`${playerPosition}|${slotPosition}`] ?? PAIRS[`${slotPosition}|${playerPosition}`] ?? 0.6
  );
}
