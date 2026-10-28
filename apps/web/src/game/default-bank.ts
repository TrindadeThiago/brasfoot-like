import { DEFAULT_PROFILE, generateFootballWorld } from "@brasfoot-like/engine";

/** Seed do mundo padrão quando o jogador não digita uma: o mesmo mundo para todos (024). */
export const DEFAULT_WORLD_SEED = "mundo-padrao-1";

let cached: { seed: string; bank: unknown } | undefined;

/**
 * Mundo padrão do jogo (024): as cinco confederações do futebol com 15 países, o Brasil em quatro
 * divisões e quatro estaduais, clubes e jogadores fictícios em lugares reais. É gerado aqui, no
 * navegador, em menos de meio segundo; a seed digitada em "avançado" muda o mundo.
 */
export function defaultBankInput(seed: string = DEFAULT_WORLD_SEED): unknown {
  if (cached?.seed !== seed) {
    cached = { seed, bank: generateFootballWorld(DEFAULT_PROFILE, seed) };
  }
  return cached.bank;
}
