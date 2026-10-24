import { createRng } from "../rng/xoshiro";
import type { Fixture, Round } from "./types";

const PHANTOM = "\u0000folga";

/** Seed de uma partida (research.md R9). */
export function fixtureSeed(
  seed: string | number,
  round: number,
  home: string,
  away: string,
): string {
  return `${seed}:r${round}:${home}-${away}`;
}

/**
 * Um turno pelo método do círculo (Berger): o último clube fica fixo e os demais giram. Na rodada
 * r, o fixo enfrenta o clube r; os pares (r+k, r−k) completam a rodada. Mandos: o fixo alterna
 * pela paridade da rodada e, nos demais pares, a paridade de k decide quem joga em casa — o que
 * limita cada clube a no máximo dois jogos seguidos com o mesmo mando.
 */
function singleTurn(teams: readonly string[]): [string, string][][] {
  const n = teams.length;
  const fixed = teams[n - 1] as string;
  const size = n - 1;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < size; r++) {
    const pairs: [string, string][] = [];
    const pivot = teams[r] as string;
    pairs.push(r % 2 === 0 ? [pivot, fixed] : [fixed, pivot]);
    for (let k = 1; k < n / 2; k++) {
      const a = teams[(r + k) % size] as string;
      const b = teams[(r - k + size) % size] as string;
      pairs.push(k % 2 === 1 ? [b, a] : [a, b]);
    }
    rounds.push(pairs);
  }
  return rounds;
}

/**
 * Calendário de pontos corridos com `turns` turnos (FR-001 a FR-004): ordem dos clubes sorteada
 * pela seed; turnos pares repetem o anterior com os mandos invertidos; com número ímpar de clubes,
 * quem enfrentaria o clube fantasma folga. `firstRound` (padrão 1) desloca a numeração: uma fase
 * que não é a primeira da divisão usa as rodadas absolutas do calendário (019 R2).
 */
export function generateCalendar(
  clubIds: readonly string[],
  turns: number,
  seed: string | number,
  firstRound = 1,
): Round[] {
  const shuffled = createRng(`${seed}:calendar`).shuffle(clubIds);
  const teams = shuffled.length % 2 === 0 ? shuffled : [...shuffled, PHANTOM];
  const base = singleTurn(teams);
  const calendar: Round[] = [];
  for (let turn = 0; turn < turns; turn++) {
    const swap = turn % 2 === 1;
    for (const pairs of base) {
      const number = firstRound + calendar.length;
      const fixtures: Fixture[] = [];
      let bye: string | undefined;
      for (const [first, second] of pairs) {
        const [home, away] = swap ? [second, first] : [first, second];
        if (home === PHANTOM) bye = away;
        else if (away === PHANTOM) bye = home;
        else
          fixtures.push({ round: number, home, away, seed: fixtureSeed(seed, number, home, away) });
      }
      calendar.push(bye === undefined ? { number, fixtures } : { number, fixtures, bye });
    }
  }
  return calendar;
}

/**
 * Junta os calendários dos grupos de uma fase, rodada a rodada (019 R2): os jogos de todos os
 * grupos na mesma rodada, e os clubes que folgam em `byes` (grupos de tamanho ímpar). Todos os
 * calendários têm as mesmas rodadas.
 */
export function mergeGroupCalendars(calendars: readonly Round[][]): Round[] {
  const first = calendars[0] ?? [];
  return first.map((round, index) => {
    const fixtures: Fixture[] = [];
    const byes: string[] = [];
    for (const calendar of calendars) {
      const same = calendar[index];
      if (!same || same.number !== round.number || calendar.length !== first.length) {
        throw new Error("calendários de grupos com rodadas diferentes");
      }
      fixtures.push(...same.fixtures);
      if (same.bye !== undefined) byes.push(same.bye);
    }
    return byes.length === 0
      ? { number: round.number, fixtures }
      : { number: round.number, fixtures, byes };
  });
}
