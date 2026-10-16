import { createRng, type Rng } from "../rng/xoshiro.js";

export interface ClockKey {
  half: 1 | 2;
  minute: number;
  stoppage: number;
}

/**
 * Gerador de um minuto da partida, derivado só da seed (ou do gerador raiz dela) e do relógio
 * (research.md R4): avançar em passos ou de uma vez consome exatamente os mesmos números.
 * `fork` não avança o gerador raiz, então reutilizá-lo é seguro.
 */
export function minuteRng(seedOrRoot: string | number | Rng, clock: ClockKey, label: string): Rng {
  const root = typeof seedOrRoot === "object" ? seedOrRoot : createRng(seedOrRoot);
  return root.fork(`min:${clock.half}:${clock.minute}:${clock.stoppage}:${label}`);
}
