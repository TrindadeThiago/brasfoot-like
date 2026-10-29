"use client";

import styles from "./chart.module.css";
import { useTip } from "./tip";

const SIZE = 200;
const RADIUS = 80;
const WIDTH_RING = 28;

/** Rosca: cada fatia tem a cor e o padrão da sua série; o total vai no centro e a legenda, fora. */
export function DonutChart({
  slices,
  total,
}: {
  slices: readonly { label: string; value: number; series: number; tip: string }[];
  total: string;
}) {
  const { on, node } = useTip(SIZE, SIZE);
  const sum = slices.reduce((acc, slice) => acc + slice.value, 0) || 1;
  const center = SIZE / 2;
  let angle = -Math.PI / 2;
  const arcs = slices.map((slice) => {
    const sweep = (slice.value / sum) * Math.PI * 2;
    const start = angle;
    const end = angle + Math.min(sweep, Math.PI * 2 - 0.0001);
    angle += sweep;
    const point = (a: number, r: number) =>
      `${center + r * Math.cos(a)},${center + r * Math.sin(a)}`;
    const at = (a: number): [number, number] => [
      center + RADIUS * Math.cos(a),
      center + RADIUS * Math.sin(a),
    ];
    const large = sweep > Math.PI ? 1 : 0;
    const outer = RADIUS;
    const inner = RADIUS - WIDTH_RING;
    return {
      key: slice.label,
      series: slice.series,
      tip: slice.tip,
      mid: at(start + (end - start) / 2),
      d: `M${point(start, outer)} A${outer},${outer} 0 ${large} 1 ${point(end, outer)} L${point(end, inner)} A${inner},${inner} 0 ${large} 0 ${point(start, inner)} Z`,
    };
  });
  return (
    <div className={`${styles.box} ${styles.boxDonut}`}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.donut}
        aria-hidden="true"
        focusable="false"
      >
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arc.d}
            className={`${styles.slice} ${styles[`f${arc.series % 5}`]}`}
            {...on(arc.mid[0], arc.mid[1], arc.tip)}
          />
        ))}
        <text x={center} y={center + 5} textAnchor="middle" className={styles.total}>
          {total}
        </text>
      </svg>
      {node}
    </div>
  );
}
