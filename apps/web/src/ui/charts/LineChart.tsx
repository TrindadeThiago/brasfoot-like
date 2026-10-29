"use client";

import { formatMoneyWords, formatNumber } from "../../i18n";
import styles from "./chart.module.css";
import { extent, HEIGHT, PAD, scaleLinear, WIDTH } from "./scale";
import { useTip } from "./tip";

/** Rótulo curto de um valor no eixo: "250 mil", "1,5 milhão" ou o número, se menor que mil. */
export function axisValue(value: number): string {
  return formatMoneyWords(value) || formatNumber(value);
}

/**
 * Linha de uma série (saldo, dívida ou saldo final por temporada). O desenho é decorativo; o valor
 * de cada ponto (`tip`) aparece no balão ao passar o mouse.
 */
export function LineChart({
  points,
}: {
  points: readonly { label: string; value: number; tip: string }[];
}) {
  const { on, node } = useTip(WIDTH, HEIGHT);
  const [min, max] = extent(points.map((point) => point.value));
  const x = scaleLinear([0, Math.max(points.length - 1, 1)], [PAD.left, WIDTH - PAD.right]);
  const y = scaleLinear([min, max], [HEIGHT - PAD.bottom, PAD.top]);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`)
    .join(" ");
  return (
    <div className={styles.box}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        aria-hidden="true"
        focusable="false"
      >
        {[min, (min + max) / 2, max].map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              className={styles.grid}
            />
            <text x={PAD.left - 6} y={y(tick) + 4} textAnchor="end" className={styles.axis}>
              {axisValue(Math.round(tick))}
            </text>
          </g>
        ))}
        <path d={path} className={styles.line} fill="none" />
        {points.map((point, index) => (
          <g key={point.label}>
            <circle cx={x(index)} cy={y(point.value)} r={3.5} className={styles.dot} />
            <text x={x(index)} y={HEIGHT - 8} textAnchor="middle" className={styles.axis}>
              {point.label}
            </text>
            <circle
              cx={x(index)}
              cy={y(point.value)}
              r={14}
              className={styles.hit}
              {...on(x(index), y(point.value), point.tip)}
            />
          </g>
        ))}
      </svg>
      {node}
    </div>
  );
}
