import { cyrb128, splitmix32 } from "./hash.js";

/** Estado serializável do PRNG: 4 inteiros sem sinal de 32 bits. */
export interface RngState {
  s: [number, number, number, number];
}

export interface WeightedItem<T> {
  value: T;
  weight: number;
}

export interface Rng {
  /** Inteiro sem sinal de 32 bits. */
  next(): number;
  /** Número em [0, 1). */
  float(): number;
  /** Inteiro uniforme em [min, max], limites inclusivos. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly WeightedItem<T>[]): T;
  /** Devolve uma cópia embaralhada; não altera a lista recebida. */
  shuffle<T>(items: readonly T[]): T[];
  /** Sub-gerador independente e determinístico; não avança este gerador. */
  fork(label: string): Rng;
  state(): RngState;
}

const UINT32_RANGE = 4294967296;

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

function seedToState(seed: string | number): [number, number, number, number] {
  if (typeof seed === "number" && !Number.isFinite(seed)) {
    throw new Error(`seed inválida: ${seed}`);
  }
  const hashed = cyrb128(typeof seed === "number" ? `${seed}` : seed);
  const state = hashed.map((value, index) => splitmix32(value + index)) as [
    number,
    number,
    number,
    number,
  ];
  if (state.every((value) => value === 0)) {
    state[0] = 1;
  }
  return state;
}

class Xoshiro128 implements Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(state: readonly [number, number, number, number]) {
    [this.s0, this.s1, this.s2, this.s3] = state;
  }

  next(): number {
    const result = Math.imul(rotl(Math.imul(this.s1, 5), 7), 9) >>> 0;
    const t = this.s1 << 9;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = rotl(this.s3, 11);
    return result;
  }

  float(): number {
    return this.next() / UINT32_RANGE;
  }

  int(min: number, max: number): number {
    if (!Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      throw new Error(`faixa inválida: [${min}, ${max}]`);
    }
    const range = max - min + 1;
    if (range > UINT32_RANGE) {
      throw new Error(`faixa grande demais: [${min}, ${max}]`);
    }
    // Amostragem por rejeição para evitar viés do módulo.
    const limit = UINT32_RANGE - (UINT32_RANGE % range);
    let value = this.next();
    while (value >= limit) {
      value = this.next();
    }
    return min + (value % range);
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("pick em lista vazia");
    }
    return items[this.int(0, items.length - 1)] as T;
  }

  weighted<T>(items: readonly WeightedItem<T>[]): T {
    let total = 0;
    for (const item of items) {
      if (!(item.weight >= 0) || !Number.isFinite(item.weight)) {
        throw new Error(`peso inválido: ${item.weight}`);
      }
      total += item.weight;
    }
    if (total <= 0) {
      throw new Error("weighted sem peso positivo");
    }
    const target = this.float() * total;
    let cumulative = 0;
    let last: T | undefined;
    for (const item of items) {
      if (item.weight === 0) continue;
      cumulative += item.weight;
      last = item.value;
      if (target < cumulative) {
        return item.value;
      }
    }
    return last as T;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  }

  fork(label: string): Rng {
    return new Xoshiro128(seedToState(`${this.s0}:${this.s1}:${this.s2}:${this.s3}|${label}`));
  }

  state(): RngState {
    return { s: [this.s0 >>> 0, this.s1 >>> 0, this.s2 >>> 0, this.s3 >>> 0] };
  }
}

export function createRng(seed: string | number): Rng {
  return new Xoshiro128(seedToState(seed));
}

export function restoreRng(state: RngState): Rng {
  const values = state.s;
  if (
    values.length !== 4 ||
    values.some((value) => !Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) ||
    values.every((value) => value === 0)
  ) {
    throw new Error("estado de PRNG inválido");
  }
  return new Xoshiro128(values);
}
