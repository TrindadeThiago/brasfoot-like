import { describe, expect, it } from "vitest";
import { maximizeAssignment } from "../../src/match/hungarian.js";
import { createRng } from "../../src/rng/xoshiro.js";

function total(matrix: number[][], assignment: number[]): number {
  return assignment.reduce((sum, row, column) => sum + (matrix[row]?.[column] ?? 0), 0);
}

/** Força bruta para matrizes pequenas: melhor soma possível. */
function bruteForce(matrix: number[][]): number {
  const rows = matrix.length;
  const columns = matrix[0]?.length ?? 0;
  let best = Number.NEGATIVE_INFINITY;
  const used = new Set<number>();
  const visit = (column: number, sum: number) => {
    if (column === columns) {
      best = Math.max(best, sum);
      return;
    }
    for (let row = 0; row < rows; row++) {
      if (used.has(row)) continue;
      used.add(row);
      visit(column + 1, sum + (matrix[row]?.[column] ?? 0));
      used.delete(row);
    }
  };
  visit(0, 0);
  return best;
}

describe("maximizeAssignment (algoritmo húngaro)", () => {
  it("acha o ótimo numa matriz quadrada conhecida", () => {
    const matrix = [
      [7, 5, 1],
      [2, 8, 3],
      [6, 4, 9],
    ];
    const assignment = maximizeAssignment(matrix);
    expect(total(matrix, assignment)).toBe(24);
  });

  it("acha o ótimo em matrizes retangulares aleatórias (mais linhas que colunas)", () => {
    const rng = createRng("hungaro");
    for (let trial = 0; trial < 40; trial++) {
      const rows = rng.int(4, 7);
      const columns = rng.int(2, rows);
      const matrix = Array.from({ length: rows }, () =>
        Array.from({ length: columns }, () => rng.int(0, 100)),
      );
      const assignment = maximizeAssignment(matrix);
      expect(new Set(assignment).size).toBe(columns);
      expect(total(matrix, assignment)).toBe(bruteForce(matrix));
    }
  });

  it("desempata pela menor linha", () => {
    expect(maximizeAssignment([[5], [5], [5]])).toEqual([0]);
  });

  it("resolve 40 × 11 rapidamente", () => {
    const rng = createRng("grande");
    const matrix = Array.from({ length: 40 }, () =>
      Array.from({ length: 11 }, () => rng.int(1, 100)),
    );
    maximizeAssignment(matrix);
    const times = [0, 1, 2].map(() => {
      const start = performance.now();
      maximizeAssignment(matrix);
      return performance.now() - start;
    });
    expect(Math.min(...times)).toBeLessThan(5);
  });
});
