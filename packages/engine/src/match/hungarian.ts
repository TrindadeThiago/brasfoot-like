/**
 * Atribuição ótima (algoritmo húngaro, versão O(n²m) para matrizes retangulares). Recebe uma
 * matriz `valores[linha][coluna]` com linhas ≥ colunas e devolve, para cada coluna, a linha
 * escolhida, maximizando a soma. Determinística: empates ficam com a primeira linha encontrada.
 */
export function maximizeAssignment(values: readonly (readonly number[])[]): number[] {
  const m = values.length;
  const n = values[0]?.length ?? 0;
  if (n === 0) return [];
  if (m < n) throw new Error("a matriz precisa ter ao menos tantas linhas quanto colunas");

  // cost[i][j]: i = coluna (1..n), j = linha (1..m); minimizar o negativo do valor.
  const cost = (i: number, j: number) => -(values[j - 1]?.[i - 1] ?? 0);
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0);
  const way = new Array<number>(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Number.POSITIVE_INFINITY);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0] as number;
      let delta = Number.POSITIVE_INFINITY;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const current = cost(i0, j) - (u[i0] as number) - (v[j] as number);
        if (current < (minv[j] as number)) {
          minv[j] = current;
          way[j] = j0;
        }
        if ((minv[j] as number) < delta) {
          delta = minv[j] as number;
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          const row = p[j] as number;
          u[row] = (u[row] as number) + delta;
          v[j] = (v[j] as number) - delta;
        } else {
          minv[j] = (minv[j] as number) - delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0] as number;
      p[j0] = p[j1] as number;
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    const column = p[j] as number;
    if (column !== 0) assignment[column - 1] = j - 1;
  }
  return assignment;
}
