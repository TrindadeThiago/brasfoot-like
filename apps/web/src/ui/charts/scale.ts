/** Escala linear simples dos gráficos: leva um valor do intervalo dos dados à área do desenho. */
export function scaleLinear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

/** Intervalo dos dados com o zero incluído quando faz sentido e uma folga mínima. */
export function extent(values: readonly number[], includeZero = false): [number, number] {
  const min = Math.min(...values, ...(includeZero ? [0] : []));
  const max = Math.max(...values, ...(includeZero ? [0] : []));
  return min === max ? [min - 1, max + 1] : [min, max];
}

export const WIDTH = 640;
export const HEIGHT = 240;
export const PAD = { top: 12, right: 16, bottom: 28, left: 88 };
