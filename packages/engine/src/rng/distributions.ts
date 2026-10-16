import type { Rng } from "./xoshiro";

/** Média de `n` uniformes: aproximadamente normal, em [0, 1), centrada em 0,5. */
export function irwinHall(rng: Rng, n = 4): number {
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += rng.float();
  }
  return sum / n;
}

/** Distribuição triangular contínua em [min, max] com moda `mode`. Usa só `Math.sqrt` (exata). */
export function triangular(rng: Rng, min: number, mode: number, max: number): number {
  const u = rng.float();
  const span = max - min;
  const split = (mode - min) / span;
  if (u < split) {
    return min + Math.sqrt(u * span * (mode - min));
  }
  return max - Math.sqrt((1 - u) * span * (max - mode));
}

/** Inteiro em [min, max] com forma de sino (Irwin–Hall). */
export function intIrwinHall(rng: Rng, min: number, max: number, n = 4): number {
  return min + Math.floor(irwinHall(rng, n) * (max - min + 1));
}

/** Inteiro em [min, max] com distribuição triangular e moda `mode`. */
export function intTriangular(rng: Rng, min: number, mode: number, max: number): number {
  return Math.min(max, Math.floor(triangular(rng, min, mode + 0.5, max + 1)));
}

/** Valor em torno de `center`, com desvio máximo `spread`, em forma de sino. */
export function bell(rng: Rng, center: number, spread: number): number {
  return center + (irwinHall(rng, 4) - 0.5) * 2 * spread;
}
